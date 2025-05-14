<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import axios from 'axios';
import keycloak from './../../keycloak';
import { ElMessage } from 'element-plus';

// Route
const route = useRoute();

// État
const demandes = ref([]);
const loading = ref(true);
const error = ref(null);
const userEmail = ref('');
const selectedDemande = ref(null);
const showDetails = ref(false);
const showConfirmCancel = ref(false);
const demandeToCancel = ref(null);

// Filtre par statut
const statutFiltre = ref('');
const statutsDisponibles = [
  { label: 'Toutes', value: '' },
  { label: 'Validées', value: 'validee' },
  { label: 'En attente', value: 'en attente' },
  { label: 'Refusées', value: 'annulee' }
];
const demandesFiltrees = computed(() => {
  if (!statutFiltre.value) return demandes.value;
  return demandes.value.filter(d => d.statut === statutFiltre.value);
});

// Pagination
const currentPage = ref(1);
const itemsPerPage = 6;
const totalPages = computed(() => {
  const total = Math.ceil(demandesFiltrees.value.length / itemsPerPage);
  console.log('Nombre total de demandes:', demandesFiltrees.value.length);
  console.log('Nombre d\'éléments par page:', itemsPerPage);
  console.log('Nombre total de pages:', total);
  return total;
});
const paginatedDemandes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  console.log('Page courante:', currentPage.value);
  console.log('Index de début:', start);
  console.log('Index de fin:', end);
  console.log('Demandes paginées:', demandesFiltrees.value.slice(start, end));
  return demandesFiltrees.value.slice(start, end);
});
const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

// Remettre la page à 1 si on change de filtre
watch(statutFiltre, () => { currentPage.value = 1; });

// Fonction pour charger les demandes
const chargerDemandes = async () => {
  if (!keycloak.authenticated || !userEmail.value) {
    console.log('Non authentifié ou email manquant');
    error.value = "Vous devez être connecté pour voir vos demandes";
    return;
  }

  try {
    console.log('Début du chargement des demandes pour:', userEmail.value);
    loading.value = true;
    
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}/api/demandes/email/${userEmail.value}`,
      {
        headers: {
          Authorization: `Bearer ${keycloak.token}`
        }
      }
    );
    
    console.log('Données reçues du serveur:', response.data);
    
    // S'assurer que nous créons une nouvelle référence pour forcer la réactivité
    demandes.value = [...response.data];
    console.log('Demandes mises à jour dans le composant:', demandes.value);
    
  } catch (err) {
    console.error('Erreur détaillée lors du chargement:', err);
    console.error('Message d\'erreur:', err.message);
    console.error('Réponse du serveur:', err.response?.data);
    error.value = "Impossible de charger les demandes";
    ElMessage.error("Erreur lors du chargement des demandes");
  } finally {
    loading.value = false;
    console.log('Fin du chargement des demandes');
  }
};

// Fonction pour annuler une demande
const annulerDemande = async (id) => {
  try {
    console.log('Début de l\'annulation pour la demande:', id);
    console.log('État initial des demandes:', demandes.value);
    
    const response = await axios.put(
      `http://localhost:3000/api/demandes/${id}/annuler`,
      {},
      {
        headers: {
          Authorization: `Bearer ${keycloak.token}`
        }
      }
    );
    
    console.log('Réponse de l\'API:', response.data);
    
    // Mettre à jour directement la demande dans le tableau
    const index = demandes.value.findIndex(d => d.id === id);
    console.log('Index de la demande à mettre à jour:', index);
    
    if (index !== -1) {
      // Créer une nouvelle référence pour forcer la réactivité
      const updatedDemandes = [...demandes.value];
      updatedDemandes[index] = { 
        ...updatedDemandes[index], 
        statut: 'annulee',
        // Ajouter d'autres champs si nécessaire depuis response.data
        ...response.data
      };
      demandes.value = updatedDemandes;
      console.log('Demandes après mise à jour locale:', demandes.value);
    }
    
    ElMessage.success("Demande annulée avec succès");
    
    // Recharger la liste pour s'assurer que tout est synchronisé
    console.log('Début du rechargement des demandes');
    await chargerDemandes();
    console.log('Fin du rechargement des demandes');
    
  } catch (err) {
    console.error('Erreur détaillée lors de l\'annulation:', err);
    console.error('Message d\'erreur:', err.message);
    console.error('Réponse du serveur:', err.response?.data);
    ElMessage.error("Erreur lors de l'annulation de la demande");
  }
};

// Fonction d'initialisation
const init = async () => {
  try {
    loading.value = true;
    error.value = null;
    
    // Vérifier si Keycloak est déjà initialisé
    if (!keycloak.authenticated) {
      console.log('Initialisation de Keycloak...');
      await keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: `${window.location.origin}`,
      });
    }

    if (keycloak.authenticated) {
      userEmail.value = keycloak.tokenParsed.email;
      await chargerDemandes();
    } else {
      error.value = "Vous devez être connecté pour voir vos demandes";
    }
  } catch (err) {
    console.error('Erreur lors de l\'initialisation:', err);
    error.value = "Erreur lors de l'initialisation";
  } finally {
    loading.value = false;
  }
};

// Initialisation au montage
onMounted(() => {
  init();
});

// Surveiller les changements de route
watch(
  () => route.path,
  () => {
    if (route.path === '/suivi') {
      init();
    }
  }
);

// Fonction pour afficher les détails d'une demande
const showDemandeDetails = (demande) => {
  selectedDemande.value = demande;
  showDetails.value = true;
};

// Fonction pour fermer les détails
const closeDetails = () => {
  showDetails.value = false;
  selectedDemande.value = null;
};

const demanderAnnulation = (demande) => {
  demandeToCancel.value = demande;
  showConfirmCancel.value = true;
};

const confirmerAnnulation = async () => {
  if (!demandeToCancel.value) return;
  await annulerDemande(demandeToCancel.value.id);
  showConfirmCancel.value = false;
  demandeToCancel.value = null;
};

const annulationAnnulee = () => {
  showConfirmCancel.value = false;
  demandeToCancel.value = null;
};

// Ajouter un watcher pour déboguer les changements de demandes
watch(demandes, (newValue, oldValue) => {
  console.log('Changement détecté dans demandes:');
  console.log('Ancienne valeur:', oldValue);
  console.log('Nouvelle valeur:', newValue);
}, { deep: true });
</script>

<template>
  <div class="suivi-bg">
    <div class="suivi-container">
      <h2 class="suivi-title">
        <img src="/suivre.png" alt="Liste de contrôle" class="title-icon" />
        Suivi de mes demandes
      </h2>
      <!-- Filtres par statut -->
      <div class="statut-filtres">
        <button
          v-for="statut in statutsDisponibles"
          :key="statut.value"
          :class="['statut-btn', { active: statutFiltre === statut.value }]"
          @click="statutFiltre = statut.value"
        >
          {{ statut.label }}
        </button>
      </div>
      <div v-if="error" class="alert alert-danger glass-alert">{{ error }}</div>
      <div v-if="loading" class="loading-container">
        <div class="spinner-border text-light" role="status">
          <span class="visually-hidden">Chargement...</span>
        </div>
      </div>
      <div v-else-if="demandesFiltrees.length > 0" class="suivi-grid">
        <div v-for="demande in paginatedDemandes" :key="demande.id" class="suivi-card glass-card" @click="showDemandeDetails(demande)">
          <div class="card-content">
            <h5 class="card-title">{{ demande.intitule }}</h5>
            <div class="card-details">
              <div class="detail-item">
                <i class="bi bi-calendar"></i>
                <span>Date de la demande: {{ new Date(demande.dateDemande).toLocaleDateString() }}</span>
              </div>
              <div class="detail-item">
                <i class="bi bi-tag"></i>
                <span>Type d'action: {{ demande.type_action }}</span>
              </div>
              <div class="detail-item">
                <i class="bi bi-clock"></i>
                <span>Date de l'action: {{ new Date(demande.dateAction).toLocaleDateString() }}</span>
              </div>
            </div>
            <div class="card-status-actions">
              <span class="status-badge" :class="{
                'status-validated': demande.statut === 'validee',
                'status-pending': demande.statut === 'en attente',
                'status-cancelled': demande.statut === 'annulee'
              }">
                {{ demande.statut === 'validee' ? 'Validée' : 
                   demande.statut === 'en attente' ? 'En attente' : 
                   demande.statut === 'annulee' ? 'Annulée' : 'en attente' }}
              </span>
              <button 
                @click.stop="demanderAnnulation(demande)" 
                class="btn-cancel"
                :disabled="demande.statut === 'annulee'"
              >
                <i class="bi bi-x-circle"></i>
                Annuler
              </button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="no-demandes glass-alert">
        <i class="bi bi-inbox"></i>
        <p>Vous n'avez pas encore de demandes.</p>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-container">
        <button :disabled="currentPage === 1" class="arrow-btn" @click="goToPage(currentPage - 1)">
          <span aria-label="Précédent">←</span>
        </button>
        <button
          v-for="page in totalPages"
          :key="page"
          :class="['page-btn', { active: page === currentPage }]"
          @click="goToPage(page)"
        >
          {{ page }}
        </button>
        <button :disabled="currentPage === totalPages" class="arrow-btn" @click="goToPage(currentPage + 1)">
          <span aria-label="Suivant">→</span>
        </button>
      </div>

      <!-- Modal des détails -->
      <Teleport to="body">
        <div v-if="showDetails" class="modal-overlay" @click="closeDetails">
          <div class="modal-content details-modal" @click.stop>
            <div class="modal-header">
              <h3>Détails de la demande</h3>
              <button @click="closeDetails" class="btn-close">
                <span class="close-icon">×</span>
              </button>
            </div>
            <div class="modal-body" v-if="selectedDemande">
              <div class="details-section section-block">
                <h4><i class="bi bi-info-circle"></i> Informations générales</h4>
                <div class="info-list">
                  <div class="info-row">
                    <i class="bi bi-file-text"></i>
                    <span><strong>Intitulé :</strong> {{ selectedDemande.intitule }}</span>
                  </div>
                  <div class="info-row">
                    <i class="bi bi-person"></i>
                    <span><strong>Responsable :</strong> {{ selectedDemande.responsable }}</span>
                  </div>
                  <div class="info-row">
                    <i class="bi bi-envelope"></i>
                    <span><strong>Email :</strong> {{ selectedDemande.email }}</span>
                  </div>
                  <div class="info-row">
                    <i class="bi bi-tag"></i>
                    <span><strong>Type d'action :</strong> {{ selectedDemande.type_action }}</span>
                  </div>
                  <div class="info-row">
                    <i class="bi bi-calendar-event"></i>
                    <span><strong>Date de l'action :</strong> {{ selectedDemande.dateAction }}</span>
                  </div>
                </div>
              </div>

              <div class="details-section section-block">
                <h4><i class="bi bi-list-check"></i> Détails de l'action</h4>
                <div class="info-list">
                  <div class="info-row">
                    <i class="bi bi-bookmark"></i>
                    <span><strong>Thématiques :</strong> <span v-for="(theme, idx) in selectedDemande.thematiques" :key="idx" class="tag-theme">{{ theme }}</span></span>
                  </div>
                  <div class="info-row">
                    <i class="bi bi-bullseye"></i>
                    <span><strong>Objectifs :</strong> {{ selectedDemande.objectifs }}</span>
                  </div>
                  <div class="info-row">
                    <i class="bi bi-file-earmark-text"></i>
                    <span><strong>Description :</strong> {{ selectedDemande.description }}</span>
                  </div>
                </div>
              </div>

              <div v-if="selectedDemande.commentaire_admin" class="details-section section-block">
                <h4><i class="bi bi-chat-left-text"></i> Commentaire de l'administrateur</h4>
                <div class="commentaire-admin">
                  {{ selectedDemande.commentaire_admin }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- Modal de confirmation d'annulation -->
      <Teleport to="body">
        <div v-if="showConfirmCancel" class="modal-overlay">
          <div class="modal-content confirm-modal">
            <div class="modal-header">
              <h3>Confirmation</h3>
            </div>
            <div class="modal-body">
              <p>Êtes-vous sûr de vouloir annuler cette demande ? Cette action est irréversible.</p>
            </div>
            <div class="modal-footer">
              <button @click="annulationAnnulee" class="btn-cancel">Non, revenir</button>
              <button @click="confirmerAnnulation" class="btn-ok">Oui, annuler</button>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.suivi-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #e3e9f7 0%, #ffffff 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2.5rem 1rem;
}
.suivi-container {
  margin-top: 80px; /* Espace pour la navbar */
  width: 100%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.suivi-title {
  color: #0f214d;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: 1px;
  margin-bottom: 2.2rem;
  display: flex;
  align-items: center;
  gap: 0.7rem;
}
.suivi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 2.2rem;
  margin-top: 1rem;
  width: 100%;
}
.suivi-card {
  position: relative;
  background: rgba(255,255,255,0.35);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  box-shadow: 0 8px 32px 0 rgba(255, 255, 255, 0.13);
  border: 1px solid rgba(255,255,255,0.18);
  color: #222;
  padding: 2.2rem 1.5rem 1.7rem 1.5rem;
  min-height: 340px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  transition: transform 0.25s, box-shadow 0.25s, background 0.25s;
  background-clip: padding-box;
  cursor: pointer;
}
.suivi-card:hover {
  transform: scale(1.045) translateY(-8px);
  box-shadow: 0 16px 32px 0 rgba(31, 38, 135, 0.18);
  background: rgba(255,255,255,0.45);
}
.card-icon-circle {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #0f214d 60%, #b6e0e6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.2rem auto;
  font-size: 2rem;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
  transition: background 0.3s;
}
.card-title {
  color: #0f214d;
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 1.2rem;
  letter-spacing: 0.3px;
  text-align: center;
  line-height: 1.4;
  font-family: 'Poppins', sans-serif;
  height: 2.7em; /* Hauteur fixe pour 2 lignes */
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  white-space: normal;
}
.card-details {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  margin-bottom: 1rem;
  width: 100%;
}
.detail-item {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  color: #444;
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.5;
  padding: 0.4rem 0.8rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  transition: background 0.2s ease;
}
.detail-item:hover {
  background: rgba(255, 255, 255, 0.8);
}
.detail-item i {
  font-size: 1.1rem;
  color: #0f214d;
  opacity: 0.9;
}
.card-status-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 1.2rem;
  gap: 0.7rem;
}
.status-badge {
  display: inline-block;
  padding: 0.5em 1.4em;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  background: #f5f5f5;
  color: #444;
  border: none;
  margin-bottom: 0;
  text-transform: capitalize;
  transition: all 0.2s ease;
  font-family: 'Poppins', sans-serif;
}
.status-validated {
  background: #d1f7d6;
  color: #1e824c;
  border: 1.5px solid #1e824c;
}
.status-pending {
  background: #fff4d1;
  color: #e67e22;
  border: 1.5px solid #e67e22;
}
.status-cancelled {
  background: #ffd6d6;
  color: #c0392b;
  border: 1.5px solid #c0392b;
}
.card-actions {
  margin-top: 0;
  justify-content: center;
}
.btn-cancel {
  background: #dc3545;
  color: #fff;
  font-weight: 600;
  border: none;
  padding: 0.7rem 1.6rem;
  border-radius: 25px;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.15);
  transition: all 0.2s ease;
  font-size: 0.95rem;
  letter-spacing: 0.5px;
  cursor: pointer;
  outline: none;
  font-family: 'Poppins', sans-serif;
}
.btn-cancel:hover:not(:disabled) {
  background: #b02a37;
  color: #fff;
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 6px 16px rgba(220, 53, 69, 0.22);
}
.btn-cancel:disabled {
  background: #e2e3e5;
  color: #b0b0b0;
  opacity: 0.7;
  cursor: not-allowed;
  box-shadow: none;
}
@media (max-width: 900px) {
  .suivi-grid {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
}
@media (max-width: 600px) {
  .suivi-title {
    font-size: 1.2rem;
  }
  .suivi-card {
    padding: 1.2rem 0.7rem 1rem 0.7rem;
    min-height: 220px;
  }
  .card-icon-circle {
    width: 40px;
    height: 40px;
    font-size: 1.3rem;
  }
}
.title-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  margin-right: 0.7rem;
}

/* Styles pour le modal */
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
  z-index: 1000;
}

.modal-content {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.2);
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-header h3 {
  color: #0f214d;
  margin: 0;
  font-size: 1.5rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  transition: color 0.2s;
}

.btn-close:hover {
  color: #0f214d;
}

.close-icon {
  display: block;
  width: 100%;
  height: 100%;
}

.detail-section {
  margin-bottom: 2rem;
}

.detail-section h4 {
  color: #0f214d;
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}

.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item i {
  color: #0f214d;
  font-size: 1.1rem;
  margin-top: 0.2rem;
}

.detail-item span {
  color: #333;
  line-height: 1.4;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95%;
    padding: 1.5rem;
  }
  
  .detail-grid {
    grid-template-columns: 1fr;
  }
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

.details-modal {
  max-width: 600px;
  width: 95%;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.13);
  padding: 2rem 1.5rem;
}
.section-block {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.2rem 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 4px rgba(15,33,77,0.04);
  border-left: 4px solid #0f214d;
}
.details-section h4 {
  color: #0f214d;
  font-size: 1.15rem;
  margin-bottom: 1.1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.info-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.info-row {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  color: #333;
  font-size: 1rem;
}
.info-row i {
  color: #0f214d;
  font-size: 1.1rem;
  margin-top: 0.1rem;
}
.tag-theme {
  display: inline-block;
  background: #0f214d;
  color: #fff;
  border-radius: 10px;
  padding: 0.1rem 0.7rem;
  margin-left: 0.4rem;
  font-size: 0.93rem;
  font-weight: 500;
}
.commentaire-admin {
  background: #f4f8fa;
  padding: 1rem;
  border-radius: 8px;
  border-left: 4px solid #0f214d;
  margin-top: 0.5rem;
  font-style: italic;
  color: #666;
}
.pagination-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
  margin: 2rem 0 1rem 0;
}
.page-btn {
  background: #fff;
  border: 1px solid #0f214d;
  color: #0f214d;
  padding: 0.5rem 1.1rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.page-btn.active, .page-btn:hover {
  background: #0f214d;
  color: #fff;
}
.pagination-container button[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
.arrow-btn {
  background: #fff;
  border: 1.5px solid #0f214d;
  color: #0f214d;
  padding: 0.5rem 0.9rem;
  border-radius: 50%;
  font-size: 1.2rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(15,33,77,0.04);
}
.arrow-btn:hover:not([disabled]) {
  background: #0f214d;
  color: #fff;
  box-shadow: 0 2px 8px rgba(15,33,77,0.10);
}
.arrow-btn[disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
.statut-filtres {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}
.statut-btn {
  background: #fff;
  border: 1.5px solid #0f214d;
  color: #0f214d;
  padding: 0.5rem 1.3rem;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(15,33,77,0.04);
}
.statut-btn.active, .statut-btn:hover {
  background: #0f214d;
  color: #fff;
  box-shadow: 0 2px 8px rgba(15,33,77,0.10);
}

.confirm-modal {
  max-width: 400px;
  width: 95%;
  background: #fff;
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.13);
  padding: 0;
}
.confirm-modal .modal-header {
  padding: 1.5rem 1.5rem 0.5rem;
  text-align: center;
}
.confirm-modal .modal-body {
  padding: 1.5rem;
  text-align: center;
}
.confirm-modal .modal-footer {
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}
.confirm-modal .btn-cancel {
  background: #fff;
  color: #c0392b;
  border: 1.5px solid #c0392b;
  font-weight: 600;
  border-radius: 25px;
  padding: 0.7rem 2rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.confirm-modal .btn-cancel:hover {
  background: #c0392b;
  color: #fff;
}
.confirm-modal .btn-ok {
  background: #0f214d;
  color: #fff;
  font-weight: 600;
  border: none;
  border-radius: 25px;
  padding: 0.7rem 2rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.confirm-modal .btn-ok:hover {
  background: #0a1629;
}
</style> 