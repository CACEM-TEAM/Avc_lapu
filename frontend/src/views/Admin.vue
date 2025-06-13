<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import Chart from 'chart.js/auto';
import { ElNotification } from 'element-plus';
import { io } from 'socket.io-client';

// Liste des types d'actions disponibles
const typeActions = [
  'Animation',
  'Sensibilisation',
  'Tenue de Stand',
  'Information en Porte à porte',
  'Amont de collecte',
  'Permanence compostage',
  'Autre : précisez'
];

// État pour les demandes
const demandes = ref([]);
const loading = ref(false);
const error = ref(null);
const success = ref(null);

// État pour les modals
const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const modalMessage = ref('');
const showCommentModal = ref(false);
const commentaireAdmin = ref('');
const selectedAction = ref(null);
const selectedDemandeId = ref(null);

// État pour les filtres
const filters = ref({
  search: '',
  typeAction: '',
  dateFrom: '',
  dateTo: ''
});

// État pour les statistiques
const total = ref(0);
const enAttente = ref(0);
const validees = ref(0);
const refusees = ref(0);

// État pour le modal de détails
const showDetailsModal = ref(false);
const selectedDemande = ref(null);

// Couleurs pour les tags thématiques
const tagColors = [
  '#0f214d', '#f1c40f', '#e67e22', '#2ecc71', '#9b59b6', '#e74c3c', '#3498db', '#16a085', '#34495e', '#fd79a8'
];

// Pagination
const currentPage = ref(1);
const itemsPerPage = 6;
const totalPages = computed(() => Math.ceil(filteredDemandes.value.length / itemsPerPage));
const paginatedDemandes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  return filteredDemandes.value.slice(start, start + itemsPerPage);
});
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// État pour le modal de statistiques
const showStatsModal = ref(false);
let chartInstance = null;

// Filtres pour les stats
const selectedTheme = ref('');
const selectedPublic = ref('');
const selectedTypeAction = ref('');
const selectedYear = ref('');
const selectedStatut = ref('');

const allThemes = computed(() => {
  const set = new Set();
  demandes.value.forEach(d => {
    (Array.isArray(d.thematiques) ? d.thematiques : []).forEach(t => set.add(t));
  });
  return Array.from(set);
});
const allPublics = computed(() => {
  const set = new Set();
  demandes.value.forEach(d => {
    (Array.isArray(d.publics_cibles) ? d.publics_cibles : []).forEach(p => set.add(p));
  });
  return Array.from(set);
});
const allTypeActions = computed(() => {
  const set = new Set();
  demandes.value.forEach(d => { if (d.type_action) set.add(d.type_action); });
  return Array.from(set);
});

const allYears = computed(() => {
  const set = new Set();
  demandes.value.forEach(d => {
    if (d.dateDemande) set.add(new Date(d.dateDemande).getFullYear());
  });
  return Array.from(set).sort((a, b) => b - a);
});
const allStatuts = [
  { label: 'Tous statuts', value: '' },
  { label: 'Validée', value: 'validee' },
  { label: 'En attente', value: 'en attente' },
  { label: 'Annulée', value: 'annulee' }
];

// État pour le filtre de statut
const statutFiltre = ref('');

// Calcul des pages à afficher autour de la page courante
const displayedPages = computed(() => {
  const pages = [];
  const range = 1; // Nombre de pages à afficher de chaque côté de la page courante
  
  for (let i = Math.max(1, currentPage.value - range); 
       i <= Math.min(totalPages.value, currentPage.value + range); 
       i++) {
    pages.push(i);
  }
  
  return pages;
});

// Fonction pour afficher une notification d'erreur
const showError = (message) => {
  ElNotification({
    type: 'error',
    title: 'Erreur',
    message: message,
    duration: 5000,
    position: 'top-right'
  });
};

// Fonction pour afficher une notification d'information
const showNotification = (type, title, message) => {
  ElNotification({
    type,
    title,
    message,
    duration: 5000,
    position: 'top-right'
  });
};

// Fonction pour filtrer les demandes
const filteredDemandes = computed(() => {
  let list = demandes.value;
  if (statutFiltre.value) {
    list = list.filter(d => d.statut === statutFiltre.value);
  }
  return list.filter(demande => {
    const matchesSearch = demande.intitule.toLowerCase().includes(filters.value.search.toLowerCase()) ||
                         demande.responsable.toLowerCase().includes(filters.value.search.toLowerCase()) ||
                         demande.email.toLowerCase().includes(filters.value.search.toLowerCase());
    
    const matchesType = !filters.value.typeAction || demande.type_action === filters.value.typeAction;
    
    const matchesDateFrom = !filters.value.dateFrom || demande.dateDemande >= filters.value.dateFrom;
    const matchesDateTo = !filters.value.dateTo || demande.dateDemande <= filters.value.dateTo;
    
    return matchesSearch && matchesType && matchesDateFrom && matchesDateTo;
  });
});

// Fonction pour mettre à jour les statistiques
const updateStats = () => {
  total.value = demandes.value.length;
  enAttente.value = demandes.value.filter(d => d.statut === 'en attente').length;
  validees.value = demandes.value.filter(d => d.statut === 'validee').length;
  refusees.value = demandes.value.filter(d => d.statut === 'annulee').length;
};

// Fonction pour réinitialiser les filtres
const resetFilters = () => {
  filters.value = {
    search: '',
    typeAction: '',
    dateFrom: '',
    dateTo: ''
  };
};

// Fonction pour charger les demandes en attente
const loadDemandes = async () => {
  loading.value = true;
  try {
    const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/demandes`);
    demandes.value = response.data;
    updateStats();
  } catch (err) {
    console.error('Erreur lors du chargement des demandes:', err);
    showError("Erreur lors du chargement des demandes");
  } finally {
    loading.value = false;
  }
};

// Fonction pour ouvrir le modal de commentaire
const openCommentModal = (action, id) => {
  selectedAction.value = action;
  selectedDemandeId.value = id;
  commentaireAdmin.value = '';
  showCommentModal.value = true;
};

// Fonction pour fermer le modal de commentaire
const closeCommentModal = () => {
  showCommentModal.value = false;
  selectedAction.value = null;
  selectedDemandeId.value = null;
  commentaireAdmin.value = '';
};

// Initialisation du socket
const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket'],
  withCredentials: true
});

// Fonction pour envoyer un email
const sendMail = async (to, subject, message) => {
  try {
    return new Promise((resolve, reject) => {
      socket.emit('send-mail', {
        to,
        subject,
        message,
        contentType: 'text/html'
      }, (response) => {
        if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error || 'Erreur lors de l\'envoi du mail'));
        }
      });
    });
  } catch (error) {
    console.error('Erreur détaillée lors de l\'envoi du mail:', error);
    showNotification('error', 'Erreur', 'Erreur lors de l\'envoi du mail : ' + error.message);
    throw error;
  }
};

// Fonction pour formater la date
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Fonction pour générer le contenu de l'email de validation
const generateValidationEmailContent = (demande) => {
  const baseUrl = window.location.origin;
  return `
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 24px; box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #0f214d; margin: 0; font-size: 24px;">Votre demande a été validée</h2>
      </div>

      <div style="background: rgba(15, 33, 77, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="color: #0f214d; margin-top: 0; font-size: 18px;">Détails de la demande</h3>
        <div style="display: grid; gap: 15px;">
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Intitulé :</strong>
            <span style="color: #333;">${demande.intitule}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Type d'action :</strong>
            <span style="color: #333;">${demande.type_action}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Date :</strong>
            <span style="color: #333;">${formatDate(demande.dateAction)}</span>
          </div>
          ${demande.commentaire_admin ? `
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Commentaire :</strong>
            <span style="color: #333;">${demande.commentaire_admin}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666; margin-bottom: 20px;">Votre demande a été validée. Vous pouvez suivre son évolution sur la plateforme.</p>
        <a href="${baseUrl}/suivi" style="display: inline-block; background: #0f214d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s ease;">Suivre ma demande</a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(15, 33, 77, 0.1);">
        <p style="color: #666; font-size: 14px; margin: 0;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <a href="mailto:murielle.lapu@cacem-mq.com" style="color: #0f214d; text-decoration: none; font-weight: 600;">murielle.lapu@cacem-mq.com</a>
      </div>
    </div>
  `;
};

// Fonction pour générer le contenu de l'email de refus
const generateRejectionEmailContent = (demande) => {
  const baseUrl = window.location.origin;
  return `
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 24px; box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #0f214d; margin: 0; font-size: 24px;">Votre demande a été refusée</h2>
      </div>

      <div style="background: rgba(15, 33, 77, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="color: #0f214d; margin-top: 0; font-size: 18px;">Détails de la demande</h3>
        <div style="display: grid; gap: 15px;">
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Intitulé :</strong>
            <span style="color: #333;">${demande.intitule}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Type d'action :</strong>
            <span style="color: #333;">${demande.type_action}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Date :</strong>
            <span style="color: #333;">${formatDate(demande.dateAction)}</span>
          </div>
          ${demande.commentaire_admin ? `
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Motif du refus :</strong>
            <span style="color: #333;">${demande.commentaire_admin}</span>
          </div>
          ` : ''}
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666; margin-bottom: 20px;">Votre demande a été refusée. Vous pouvez soumettre une nouvelle demande en tenant compte des commentaires fournis.</p>
        <a href="${baseUrl}/demande" style="display: inline-block; background: #0f214d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s ease;">Nouvelle demande</a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(15, 33, 77, 0.1);">
        <p style="color: #666; font-size: 14px; margin: 0;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <a href="mailto:murielle.lapu@cacem-mq.com" style="color: #0f214d; text-decoration: none; font-weight: 600;">murielle.lapu@cacem-mq.com</a>
      </div>
    </div>
  `;
};

// Modification de la fonction validerDemande
const validerDemande = async () => {
  try {
    // Valider directement la demande avec le commentaire
    const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/demandes/${selectedDemandeId.value}/validate`, {
      commentaire_admin: commentaireAdmin.value
    });
    
    // Afficher le succès
    success.value = "La demande a été validée avec succès";
    modalMessage.value = "La demande a été validée avec succès";
    showSuccessModal.value = true;
    closeCommentModal();
    
    // Recharger les demandes
    loadDemandes().catch(error => {
      console.error('Erreur lors du rechargement des demandes:', error);
      showNotification('warning', 'Information', "La demande a été validée mais il y a eu une erreur lors du rechargement de la liste.");
    });
  } catch (err) {
    console.error('Erreur lors de la validation:', err);
    showError("Erreur lors de la validation de la demande");
  }
};

// Modification de la fonction refuserDemande
const refuserDemande = async () => {
  try {
    // Refuser directement la demande avec le commentaire
    const response = await axios.put(`${import.meta.env.VITE_API_URL}/api/demandes/${selectedDemandeId.value}/reject`, {
      commentaire_admin: commentaireAdmin.value
    });
    
    // Afficher le succès
    success.value = "La demande a été refusée";
    modalMessage.value = "La demande a été refusée";
    showSuccessModal.value = true;
    closeCommentModal();
    
    // Recharger les demandes
    loadDemandes().catch(error => {
      console.error('Erreur lors du rechargement des demandes:', error);
      showNotification('warning', 'Information', "La demande a été refusée mais il y a eu une erreur lors du rechargement de la liste.");
    });
  } catch (err) {
    console.error('Erreur lors du refus de la demande:', err);
    showError("Erreur lors du refus de la demande");
  }
};

// Fonction pour tronquer le texte
const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};

// Fonction pour afficher les détails
const showDetails = (demande) => {
  selectedDemande.value = demande;
  showDetailsModal.value = true;
};

// Fonction pour fermer le modal de détails
const closeDetailsModal = () => {
  showDetailsModal.value = false;
  selectedDemande.value = null;
};

// Fonction pour ouvrir le modal de statistiques
const openStatsModal = () => {
  showStatsModal.value = true;
  setTimeout(renderChart, 100); // attendre le DOM
};

// Fonction pour fermer le modal de statistiques
const closeStatsModal = () => {
  showStatsModal.value = false;
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
};

function getQuarter(dateStr) {
  const d = new Date(dateStr);
  return Math.floor(d.getMonth() / 3) + 1;
}

function getFilteredDemandes() {
  return demandes.value.filter(demande => {
    const themeOk = !selectedTheme.value || (Array.isArray(demande.thematiques) && demande.thematiques.includes(selectedTheme.value));
    const publicOk = !selectedPublic.value || (Array.isArray(demande.publics_cibles) && demande.publics_cibles.includes(selectedPublic.value));
    const typeOk = !selectedTypeAction.value || demande.type_action === selectedTypeAction.value;
    const yearOk = !selectedYear.value || new Date(demande.dateDemande).getFullYear() == selectedYear.value;
    const statutOk = !selectedStatut.value || demande.statut === selectedStatut.value;
    return themeOk && publicOk && typeOk && yearOk && statutOk;
  });
}

function renderChart() {
  const ctx = document.getElementById('statsChart').getContext('2d');
  const year = new Date().getFullYear();
  const quarters = [0, 0, 0, 0];
  getFilteredDemandes().forEach(demande => {
    const d = new Date(demande.dateDemande);
    if (d.getFullYear() === year) {
      const q = getQuarter(demande.dateDemande);
      quarters[q - 1]++;
    }
  });
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['T1', 'T2', 'T3', 'T4'],
      datasets: [{
        label: `Demandes par trimestre (${year})`,
        data: quarters,
        backgroundColor: ['#0f214d', '#f1c40f', '#e67e22', '#2ecc71']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: `Demandes par trimestre (${year})` }
      },
      scales: {
        y: { beginAtZero: true, precision: 0 }
      }
    }
  });
}

watch([selectedTheme, selectedPublic, selectedTypeAction, selectedYear, selectedStatut], () => {
  if (showStatsModal.value) setTimeout(renderChart, 50);
});

// Fonction pour définir le filtre de statut
const setStatutFiltre = (statut) => {
  if (statutFiltre.value === statut) {
    statutFiltre.value = '';
  } else {
    statutFiltre.value = statut;
  }
};

// Chargement initial des demandes
onMounted(() => {
  loadDemandes();
});

function exportCSV() {
  const data = filteredDemandes.value;
  if (!data.length) return;
  const columns = [
    'intitule', 'responsable', 'email', 'type_action', 'dateDemande', 'dateAction', 'statut', 'thematiques', 'publics_cibles', 'objectifs', 'description', 'lieu', 'horaire', 'besoins_humains', 'materiel', 'partenaires', 'commentaire_admin'
  ];
  const header = columns.join(';');
  const rows = data.map(d =>
    columns.map(col => {
      let val = d[col];
      if (Array.isArray(val)) val = val.join(', ');
      if (val === undefined || val === null) val = '';
      return '"' + String(val).replace(/"/g, '""') + '"';
    }).join(';')
  );
  const csv = [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'demandes_export.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Génère des styles aléatoires pour chaque bulle
function bubbleStyle(n) {
  // Bulles blanches avec des opacités encore plus subtiles
  const opacities = [0.015, 0.02, 0.025, 0.03, 0.035];
  const size = 25 + Math.random() * 45; // Bulles légèrement plus petites
  const left = Math.random() * 100;
  const delay = Math.random() * 20; // Délai plus aléatoire
  const duration = 25 + Math.random() * 20; // Animation plus lente
  const opacity = opacities[n % opacities.length];
  const scale = 0.85 + Math.random() * 0.3; // Variation d'échelle plus subtile
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    background: `rgba(255, 255, 255, ${opacity})`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    transform: `scale(${scale})`,
    backdropFilter: 'blur(3px)',
    boxShadow: '0 0 15px rgba(255, 255, 255, 0.1)' // Ajout d'une légère lueur
  };
}

const closeSuccessModal = () => {
  showSuccessModal.value = false;
  modalMessage.value = '';
};
</script>

<template>
  <div class="admin-bg">
    <div class="bubbles-bg">
      <span class="bubble" v-for="n in 30" :key="n" :style="bubbleStyle(n)"></span>
    </div>
    <div class="admin-container">
      <!-- Ajout du breadcrumb -->
      <div class="breadcrumb">
        <span class="breadcrumb-item">Accueil</span>
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-item active">Administration</span>
      </div>

      <div class="admin-header-flex">
        <h2 class="admin-title">
          Administration des demandes
        </h2>
        <div class="admin-header-btns">
          <button class="btn-stats" @click="openStatsModal">
            <i class="bi bi-bar-chart"></i> Statistiques
          </button>
          <button class="btn-export" @click="exportCSV">
            <i class="bi bi-download"></i> Export CSV
          </button>
        </div>
      </div>

      <!-- Statistiques -->
      <div class="stats-container">
        <div class="stat-card" :class="{active: statutFiltre === ''}" @click="setStatutFiltre('')">
          <h3>Total</h3>
          <p>{{ total }}</p>
        </div>
        <div class="stat-card" :class="{active: statutFiltre === 'en attente'}" @click="setStatutFiltre('en attente')">
          <h3>En attente</h3>
          <p>{{ enAttente }}</p>
        </div>
        <div class="stat-card" :class="{active: statutFiltre === 'validee'}" @click="setStatutFiltre('validee')">
          <h3>Validées</h3>
          <p>{{ validees }}</p>
        </div>
        <div class="stat-card" :class="{active: statutFiltre === 'annulee'}" @click="setStatutFiltre('annulee')">
          <h3>Refusées</h3>
          <p>{{ refusees }}</p>
        </div>
      </div>

      <!-- Filtres -->
      <div class="filters-container glass-card">
        <div class="filters-header">
          <h3>Filtres</h3>
          <button @click="resetFilters" class="btn-reset">Réinitialiser</button>
        </div>
        <div class="filters-body">
          <div class="filter-group">
            <label>Recherche</label>
            <input 
              type="text" 
              v-model="filters.search" 
              placeholder="Rechercher par intitulé, responsable ou email"
              class="filter-input"
            />
          </div>
          <div class="filter-group">
            <label>Type d'action</label>
            <select v-model="filters.typeAction" class="filter-input">
              <option value="">Tous les types</option>
              <option v-for="type in typeActions" :key="type" :value="type">
                {{ type }}
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label>Date de demande</label>
            <div class="date-range">
              <input 
                type="date" 
                v-model="filters.dateFrom" 
                class="filter-input"
                placeholder="Du"
              />
              <input 
                type="date" 
                v-model="filters.dateTo" 
                class="filter-input"
                placeholder="Au"
              />
            </div>
          </div>
        </div>
      </div>

      <div v-if="loading" class="loading-container">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
      </div>

      <div v-else-if="filteredDemandes.length === 0" class="no-demandes">
        <p>Aucune demande ne correspond aux critères de recherche</p>
      </div>

      <div v-else class="demandes-grid">
        <div v-for="demande in paginatedDemandes" 
             :key="demande.id" 
             class="demande-card glass-card">
          <div class="card-header">
            <h3>{{ demande.intitule }}</h3>
            <div class="header-flex">
              <span class="date">Demande du {{ demande.dateDemande }}</span>
              <span v-if="demande.statut === 'validee'" class="badge-status badge-validee">VALIDÉE</span>
              <span v-else-if="demande.statut === 'annulee'" class="badge-status badge-refuse">REFUSÉE</span>
              <span v-else-if="demande.statut === 'en attente'" class="badge-status badge-attente">EN ATTENTE</span>
            </div>
          </div>

          <div class="card-body">
            <div class="info-group">
              <label>Responsable:</label>
              <span>{{ demande.responsable }}</span>
            </div>
            <div class="info-group">
              <label>Email:</label>
              <span>{{ demande.email }}</span>
            </div>
            <div class="info-group">
              <label>Type d'action:</label>
              <span>{{ demande.type_action }}</span>
            </div>
            <div class="info-group">
              <label>Date de l'action:</label>
              <span>{{ demande.dateAction }}</span>
            </div>
           
            <div class="card-actions">
              <button @click="showDetails(demande)" class="btn-details">
                <span>Voir les détails</span>
                <i class="arrow-right">→</i>
              </button>
            </div>
          </div>

          <div class="card-footer">
            <template v-if="demande.statut === 'en attente'">
              <button @click="openCommentModal('validate', demande.id)" class="btn-validate">
                Valider
              </button>
              <button @click="openCommentModal('reject', demande.id)" class="btn-reject">
                Refuser
              </button>
            </template>
            <template v-else>
              <span class="status-text">
                {{ demande.statut === 'validee' ? 'Demande validée' : 
                   demande.statut === 'annulee' ? 'Demande refusée' : 'En attente' }}
              </span>
            </template>
          </div>
        </div>
      </div>

      <!-- Pagination moderne et élégante -->
      <div v-if="totalPages > 1" class="pagination-container">
        <div class="pagination-controls">
          <button 
            :disabled="currentPage === 1" 
            class="arrow-btn" 
            @click="goToPage(currentPage - 1)"
            aria-label="Page précédente"
          >
            <span>←</span>
          </button>
          <!-- Première page -->
          <button
            v-if="currentPage > 2"
            class="page-btn"
            @click="goToPage(1)"
          >
            1
          </button>
          <!-- Points de suspension si nécessaire -->
          <span v-if="currentPage > 3" class="pagination-ellipsis">...</span>
          <!-- Pages autour de la page courante -->
          <button
            v-for="page in displayedPages"
            :key="page"
            :class="['page-btn', { active: page === currentPage }]"
            @click="goToPage(page)"
          >
            {{ page }}
          </button>
          <!-- Points de suspension si nécessaire -->
          <span v-if="currentPage < totalPages - 2" class="pagination-ellipsis">...</span>
          <!-- Dernière page -->
          <button
            v-if="currentPage < totalPages - 1"
            class="page-btn"
            @click="goToPage(totalPages)"
          >
            {{ totalPages }}
          </button>
          <button 
            :disabled="currentPage === totalPages" 
            class="arrow-btn" 
            @click="goToPage(currentPage + 1)"
            aria-label="Page suivante"
          >
            <span>→</span>
          </button>
        </div>
        <div class="pagination-info">
          Page {{ currentPage }} sur {{ totalPages }}
        </div>
      </div>

      <!-- Modal de succès -->
      <Teleport to="body">
        <div v-if="showSuccessModal" class="modal-overlay">
          <div class="modal-content success-modal">
            <div class="modal-header">
              <h3>✅ Succès</h3>
            </div>
            <div class="modal-body">
              <p>{{ modalMessage }}</p>
            </div>
            <div class="modal-footer">
              <button @click="closeSuccessModal" class="btn-ok">
                OK
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal d'erreur -->
      <Teleport to="body">
        <div v-if="showErrorModal" class="modal-overlay">
          <div class="modal-content error-modal">
            <div class="modal-header">
              <h3>⚠️ Attention</h3>
            </div>
            <div class="modal-body">
              <p>{{ modalMessage }}</p>
            </div>
            <div class="modal-footer">
              <button @click="closeErrorModal" class="btn-ok">
                OK
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal de détails -->
      <Teleport to="body">
        <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
          <div class="modal-content details-modal" @click.stop>
            <div class="modal-header">
              <h3>Détails de la demande</h3>
              <button @click="closeDetailsModal" class="btn-close">
                <span class="close-icon">×</span>
              </button>
            </div>
            <div class="modal-body" v-if="selectedDemande">
              <div class="details-section">
                <h4>Informations générales</h4>
                <div class="info-group">
                  <label>Intitulé:</label>
                  <p>{{ selectedDemande.intitule }}</p>
                </div>
                <div class="info-group">
                  <label>Responsable:</label>
                  <p>{{ selectedDemande.responsable }}</p>
                </div>
                <div class="info-group">
                  <label>Email:</label>
                  <p>{{ selectedDemande.email }}</p>
                </div>
                <div class="info-group">
                  <label>Type d'action:</label>
                  <p>{{ selectedDemande.type_action }}</p>
                </div>
                <div class="info-group">
                  <label>Date de l'action:</label>
                  <p>{{ selectedDemande.dateAction }}</p>
                </div>
              </div>

              <div class="details-section">
                <h4>Détails de l'action</h4>
                <div class="info-group">
                  <label>Thématiques:</label>
                  <div class="tags-container">
                    <span v-for="(theme, idx) in selectedDemande.thematiques" :key="idx" class="tag-theme" :style="{ backgroundColor: tagColors[idx % tagColors.length] }">
                      {{ theme }}
                    </span>
                  </div>
                </div>
                <div class="info-group">
                  <label>Objectifs:</label>
                  <p>{{ selectedDemande.objectifs }}</p>
                </div>
                <div class="info-group">
                  <label>Description:</label>
                  <p>{{ selectedDemande.description }}</p>
                </div>
              </div>

              <!-- Commentaire admin -->
              <div v-if="selectedDemande.commentaire_admin" class="details-section">
                <h4>Commentaire de l'administrateur</h4>
                <div class="commentaire-admin">
                  {{ selectedDemande.commentaire_admin }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal de commentaire -->
      <Teleport to="body">
        <div v-if="showCommentModal" class="modal-overlay">
          <div class="modal-content comment-modal">
            <div class="modal-header">
              <h3>{{ selectedAction === 'validate' ? 'Valider la demande' : 'Refuser la demande' }}</h3>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label for="commentaire">Commentaire :</label>
                <textarea
                  id="commentaire"
                  v-model="commentaireAdmin"
                  class="form-control"
                  rows="4"
                  placeholder="Entrez votre commentaire ici..."
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button @click="closeCommentModal" class="btn-cancel">
                Annuler
              </button>
              <button 
                @click="selectedAction === 'validate' ? validerDemande() : refuserDemande()" 
                :class="selectedAction === 'validate' ? 'btn-validate' : 'btn-reject'"
              >
                {{ selectedAction === 'validate' ? 'Valider' : 'Refuser' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal Statistiques -->
      <Teleport to="body">
        <div v-if="showStatsModal" class="modal-overlay">
          <div class="modal-content stats-modal">
            <div class="modal-header">
              <h3>Statistiques par trimestre</h3>
            </div>
            <div class="modal-body">
              <div class="stats-filtres">
                <select v-model="selectedYear">
                  <option value="">Toutes années</option>
                  <option v-for="year in allYears" :key="year" :value="year">{{ year }}</option>
                </select>
                <select v-model="selectedStatut">
                  <option v-for="s in allStatuts" :key="s.value" :value="s.value">{{ s.label }}</option>
                </select>
                <select v-model="selectedTheme">
                  <option value="">Toutes thématiques</option>
                  <option v-for="theme in allThemes" :key="theme" :value="theme">{{ theme }}</option>
                </select>
                <select v-model="selectedPublic">
                  <option value="">Tous publics</option>
                  <option v-for="pub in allPublics" :key="pub" :value="pub">{{ pub }}</option>
                </select>
                <select v-model="selectedTypeAction">
                  <option value="">Tous types d'action</option>
                  <option v-for="type in allTypeActions" :key="type" :value="type">{{ type }}</option>
                </select>
              </div>
              <canvas id="statsChart" width="400" height="220"></canvas>
            </div>
            <div class="modal-footer">
              <button @click="closeStatsModal" class="btn-ok">Fermer</button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.admin-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #e3e9f7 0%, #ffffff 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2.5rem 1rem;
  position: relative;
  z-index: 1;
}

.bubbles-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(135deg, #e3e9f7 0%, #ffffff 100%);
  opacity: 0.95; /* Légère transparence du fond */
}

.bubble {
  position: absolute;
  bottom: -100px;
  border-radius: 50%;
  animation: float linear infinite;
  will-change: transform;
  filter: blur(2px);
  mix-blend-mode: soft-light; /* Mode de fusion plus doux */
  pointer-events: none;
}

@keyframes float {
  0% {
    transform: translateY(0) scale(1) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  50% {
    transform: translateY(-50vh) scale(1.1) rotate(5deg);
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) scale(0.9) rotate(-5deg);
    opacity: 0;
  }
}

.admin-container {
  margin-top: 60px; /* Réduit pour accommoder le breadcrumb */
  width: 100%;
  max-width: 1200px;
}

.admin-header-flex {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.admin-title {
  color: #0f214d;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  margin-bottom: 2.2rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  line-height: 1.2;
}

.admin-header-btns {
  display: flex;
  gap: 1rem;
}

.btn-stats {
  background: var(--gradient-primary);
  color: #fff;
  border: none;
  border-radius: 25px;
  padding: 0.7rem 2rem;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  box-shadow: 0 2px 8px rgba(0,165,171,0.09);
}

.btn-stats:hover {
  background: #008c91;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.no-demandes {
  text-align: center;
  color: #666;
  font-size: 1.2rem;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.demandes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
  padding: 1rem;
}

.demande-card {
  animation: fadeInUp 0.7s cubic-bezier(0.23, 1, 0.32, 1);
  background: rgba(255, 255, 255, 0.95);
  border-radius: 18px;
  overflow: hidden;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 4px 16px rgba(0, 165, 171, 0.08);
  border: 1px solid rgba(0, 165, 171, 0.08);
  position: relative;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(40px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.demande-card:hover {
  transform: translateY(-7px) scale(1.03) rotate(-0.5deg);
  box-shadow: 0 12px 32px rgba(0, 165, 171, 0.18);
}

.card-header {
  padding: 1.3rem 1.5rem 1rem 1.5rem;
  background: rgb(255, 255, 255);
  border-bottom: 1px solid rgba(0, 165, 171, 0.13);
  border-radius: 18px 18px 0 0;
}

.card-header h3 {
  margin: 0;
  color: #0f214d;
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  height: 2.7em; /* Hauteur fixe pour 2 lignes */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
}

.date {
  display: block;
  color: #888;
  font-size: 0.93rem;
  margin-top: 0.4rem;
}

.card-body {
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  background: #f8fbfc;
  border-radius: 0 0 14px 14px;
  box-shadow: 0 1px 4px rgba(0,165,171,0.03);
  margin-bottom: 0.5rem;
}

.info-group {
  margin-bottom: 1.1rem;
  padding: 0.9rem 1.2rem;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,165,171,0.04);
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.info-group:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,165,171,0.08);
}

.info-group label {
  color: #0f214d;
  font-size: 0.93rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
  letter-spacing: 0.2px;
}

.info-group span, .info-group p {
  color: #222;
  font-size: 1rem;
  line-height: 1.5;
  font-family: 'Poppins', Arial, sans-serif;
}

.info-group.thematiques {
  height: 40px;
  overflow: hidden;
  display: flex;
  align-items: flex-start;
}
.info-group.objectifs {
  height: 48px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.info-group.description {
  height: 48px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}
.info-group.objectifs p,
.info-group.description p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin: 0;
}

.card-footer {
  padding: 1.2rem 1.5rem 1.5rem 1.5rem;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  border-top: 1px solid rgba(0, 165, 171, 0.13);
  background: #ffffff;
  border-radius: 0 0 18px 18px;
}

.btn-validate, .btn-reject {
  padding: 0.9rem 1.8rem;
  border-radius: 25px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,165,171,0.1);
  letter-spacing: 0.3px;
}

.btn-validate {
  background: var(--gradient-primary);
  color: white;
}

.btn-validate:hover {
  background: #008c91;
  transform: translateY(-2px);
}

.btn-validate:active {
  transform: scale(0.96);
  box-shadow: 0 1px 2px rgba(0,165,171,0.09);
}

.btn-reject {
  background: #e74c3c;
  color: white;
}

.btn-reject:hover {
  background: #c0392b;
  transform: translateY(-2px);
}

.btn-reject:active {
  transform: scale(0.96);
  box-shadow: 0 1px 2px rgba(0,165,171,0.09);
}

/* Styles pour les modals */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
  animation: modalFadeIn 0.35s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    backdrop-filter: blur(0px);
  }
  to {
    opacity: 1;
    backdrop-filter: blur(4px);
  }
}

.modal-content {
  background: white;
  border-radius: 20px;
  box-shadow: 0 12px 40px rgba(31, 38, 135, 0.15);
  width: 100%;
  max-width: 800px;
  position: relative;
  z-index: 10000;
  scrollbar-width: thin;
  scrollbar-color: #0f214d #f0f0f0;
  animation: modalSlideIn 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: translateY(60px) scale(0.97);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-header {
  padding: 1.8rem 2rem;
  border-bottom: 1px solid rgba(0, 165, 171, 0.15);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  color: #0f214d;
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 2px solid #0f214d;
  background: white;
  color: #0f214d;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  padding: 0;
}

.btn-close:hover {
  background: #0f214d;
  color: white;
  transform: rotate(90deg);
}

.close-icon {
  font-size: 24px;
  line-height: 1;
  font-weight: bold;
}

.success-modal .modal-header h3 {
  color: #1e824c;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.error-modal .modal-header h3 {
  color: #c0392b;
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.modal-body {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
  padding: 2rem;
}

.modal-body p {
  color: #444;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid rgba(0,0,0,0.1);
  text-align: center;
}

.btn-ok {
  background: #0f214d;
  color: #fff;
  font-weight: 600;
  border: none;
  padding: 0.8rem 2.5rem;
  border-radius: 25px;
  font-size: 1.1rem;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(0,165,171,0.2);
}

.btn-ok:hover {
  background: #008c91;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,165,171,0.3);
}

.btn-ok:active {
  transform: scale(0.96);
  box-shadow: 0 1px 2px rgba(0,165,171,0.09);
}

.stats-container {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 2rem;
  justify-content: center;
}

.stat-card {
  width: 180px;
  height: 180px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: var(--gradient-primary);
  border-radius: 16px;
  padding: 1.5rem;
  text-align: center;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  box-shadow: 0 4px 12px rgba(15,33,77,0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(15,33,77,0.12);
}

.stat-card h3 {
  color: #fff;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  font-weight: 700;
  text-shadow: 0 2px 8px rgba(15,33,77,0.18);
}

.stat-card p {
  color: #fff;
  font-size: 2.2rem;
  font-weight: 800;
  margin: 0;
  text-shadow: 0 2px 8px rgba(15,33,77,0.18);
}

.stat-card.active {
  background: #fff;
  color: #0f214d;
  border: 2.5px solid #0f214d;
  box-shadow: 0 4px 16px rgba(0,165,171,0.13);
  transform: scale(1.04);
  transition: all 0.18s;
}
.stat-card.active h3,
.stat-card.active p {
  color: #0f214d;
  text-shadow: none;
}

.filters-container {
  margin-bottom: 2rem;
  padding: 1.5rem;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.filters-header h3 {
  color: #0f214d;
  margin: 0;
}

.btn-reset {
  background: none;
  border: 1px solid #0f214d;
  color: #0f214d;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-reset:hover {
  background: #0f214d;
  color: white;
}

.filters-body {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.filter-group label {
  color: #666;
  font-size: 0.9rem;
}

.filter-input {
  padding: 0.9rem 1.2rem;
  border: 1.5px solid rgba(0, 165, 171, 0.15);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.95);
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.filter-input:focus {
  border-color: #0f214d;
  box-shadow: 0 0 0 3px rgba(0, 165, 171, 0.15);
  outline: none;
  transform: translateY(-1px);
}

.date-range {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.status-text {
  color: #888;
  font-style: italic;
  font-size: 0.97rem;
}

.card-actions {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 165, 171, 0.1);
}

.btn-details {
  width: 100%;
  background: transparent;
  color: #0f214d;
  padding: 0.8rem;
  border: 1px solid #0f214d;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, transform 0.15s, box-shadow 0.2s;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-details:hover {
  background: #0f214d;
  color: white;
  transform: translateY(-2px);
}

.btn-details:active {
  transform: scale(0.96);
  box-shadow: 0 1px 2px rgba(0,165,171,0.09);
}

.btn-details .arrow-right {
  transition: transform 0.3s ease;
}

.btn-details:hover .arrow-right {
  transform: translateX(4px);
}

.details-modal {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.details-modal .modal-header {
  flex-shrink: 0;
}

.details-modal .modal-body {
  flex-grow: 1;
  overflow-y: auto;
}

.details-section {
  margin-bottom: 2rem;
}

.details-section h4 {
  color: #0f214d;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .admin-container {
    padding: 0 1rem;
  }
  
  .demandes-grid {
    grid-template-columns: 1fr;
  }
  
  .admin-title {
    font-size: 1.8rem;
  }
  
  .stats-container {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filters-body {
    grid-template-columns: 1fr;
  }
  
  .date-range {
    grid-template-columns: 1fr;
  }
}

/* Style personnalisé pour la barre de défilement */
.modal-content::-webkit-scrollbar {
  width: 8px;
}

.modal-content::-webkit-scrollbar-track {
  background: #f0f0f0;
  border-radius: 4px;
}

.modal-content::-webkit-scrollbar-thumb {
  background-color: #0f214d;
  border-radius: 4px;
  border: 2px solid #f0f0f0;
}

.modal-content::-webkit-scrollbar-thumb:hover {
  background-color: #008c91;
}

/* Ajustement du modal pour une meilleure expérience de défilement */
.modal-body {
  max-height: calc(90vh - 120px);
  overflow-y: auto;
  padding: 1.5rem;
}

.details-modal {
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.details-modal .modal-header {
  flex-shrink: 0;
}

.details-modal .modal-body {
  flex-grow: 1;
  overflow-y: auto;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.2rem;
}

.tag-theme {
  padding: 0.4rem 1rem;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.3px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: all 0.2s ease;
}

.tag-theme:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.comment-modal {
  max-width: 500px;
  width: 90%;
}

.comment-modal .form-group {
  margin-bottom: 1rem;
}

.comment-modal label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.comment-modal textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: vertical;
  min-height: 100px;
}

.comment-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
}

.btn-cancel {
  padding: 0.8rem 1.5rem;
  border-radius: 25px;
  font-weight: 600;
  border: 1px solid #ddd;
  background: white;
  color: #666;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #f5f5f5;
  transform: translateY(-2px);
}

.commentaire-admin {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #0f214d;
  margin-top: 0.5rem;
  font-style: italic;
  color: #666;
}

/* --- Pagination moderne et élégante --- */
.pagination-container {
  background: none;
  box-shadow: none;
  padding: 0;
  margin: 2rem 0 1rem 0;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  display: flex;
}

.pagination-info {
  background: none;
  color: #0f214d;
  font-weight: 500;
  font-size: 0.93rem;
  margin-top: 0.3rem;
  margin-bottom: 0;
  padding: 0;
  text-align: center;
  opacity: 0.8;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.page-btn, .arrow-btn {
  min-width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1.5px solid #e3e9f7;
  background: #fff;
  color: #0f214d;
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.18s;
  box-shadow: 0 1px 4px rgba(15,33,77,0.04);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.page-btn.active {
  background: linear-gradient(135deg, #0f214d 60%, #008c91 100%);
  color: #fff;
  border: none;
  box-shadow: 0 4px 12px rgba(15,33,77,0.10);
  font-weight: 700;
  transform: scale(1.08);
}

.page-btn:hover:not(.active), .arrow-btn:hover:not([disabled]) {
  background: #f1f6fa;
  color: #008c91;
  border-color: #008c91;
}

.arrow-btn[disabled] {
  color: #ccc;
  border-color: #f1f6fa;
  background: #f8f9fa;
}

.pagination-ellipsis {
  color: #666;
  font-weight: bold;
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .pagination-container {
    padding: 0;
  }
  .page-btn, .arrow-btn {
    min-width: 32px;
    height: 32px;
    font-size: 0.95rem;
  }
}

.stats-modal {
  max-width: 1100px;
  width: 100%;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.13);
  padding: 0 2.5rem 2.5rem 2.5rem;
  overflow-x: auto;
}

.stats-modal .modal-header {
  padding: 2rem 0 1rem 0;
  text-align: center;
}

.stats-modal .modal-body {
  padding: 1.5rem 0;
  text-align: center;
  min-width: 900px;
}

.stats-modal .modal-footer {
  padding: 1rem 0 0 0;
  display: flex;
  justify-content: center;
}

.stats-filtres {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}
.stats-filtres select {
  padding: 0.5rem 1.2rem;
  border-radius: 8px;
  border: 1.5px solid #0f214d;
  font-size: 1rem;
  color: #0f214d;
  background: #f8f9fa;
  font-weight: 500;
  outline: none;
  transition: border 0.2s;
  min-width: 180px;
}
.stats-filtres select:focus {
  border-color: #008c91;
}

.btn-export {
  background: var(--gradient-primary);
  color: #fff;
  border: none;
  border-radius: 25px;
  padding: 0.7rem 2rem;
  font-weight: 600;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border 0.2s;
  box-shadow: 0 2px 8px rgba(0,165,171,0.09);
}

.btn-export:hover {
  background: #008c91;
  color: #fff;
  border-color: #008c91;
}

.header-flex {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.badge-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 120px;
  height: 2.2em;
  padding: 0 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  letter-spacing: 0.6px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.badge-status:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.badge-validee {
  background: var(--gradient-primary);
  color: #fff;
}

.badge-refuse {
  background: #e74c3c;
  color: #fff;
}

.badge-attente {
  background: #f1c40f;
  color: #fff;
}

/* Styles pour le breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  padding: 0.8rem 1.2rem;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 165, 171, 0.06);
  width: fit-content;
}

.breadcrumb-item {
  color: #666;
  font-size: 0.95rem;
  font-weight: 500;
  transition: color 0.2s ease;
}

.breadcrumb-item.active {
  color: #0f214d;
  font-weight: 600;
}

.breadcrumb-separator {
  color: #999;
  font-size: 0.9rem;
}

.breadcrumb-item:not(.active):hover {
  color: #0f214d;
  cursor: pointer;
}
</style> 