<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import keycloak from './../../keycloak';
import { useRouter } from 'vue-router';
import { io } from 'socket.io-client';
import { ElMessage, ElNotification } from 'element-plus';

// Constants
const FORM_SECTIONS = {
  GENERAL: 'Informations générales',
  ACTION: 'Détails de l\'action',
  LOGISTIQUE: 'Logistique',
  VALIDATION: 'Validation'
};

const TYPE_ACTIONS = [
  { value: 'Animation', icon: '🎭' },
  { value: 'Sensibilisation', icon: '📢' },
  { value: 'Tenue de Stand', icon: '🏪' },
  { value: 'Information en Porte à porte', icon: '🚪' },
  { value: 'Amont de collecte', icon: '♻️' },
  { value: 'Permanence compostage', icon: '🌱' },
  { value: 'Autre', icon: '📝' }
];

const THEMATIQUES = [
  { value: 'Eco-gestes', icon: '🌍' },
  { value: 'Compostage', icon: '🍂' },
  { value: 'Couches lavables', icon: '👶' },
  { value: 'Gaspillage alimentaire', icon: '🍎' },
  { value: 'Tri', icon: '🗑️' },
  { value: 'Contrat de Baie', icon: '🌊' },
  { value: 'PCAET', icon: '📊' },
  { value: 'Eau et Assainissement', icon: '💧' },
  { value: 'Autre', icon: '📌' }
];

const PUBLICS_CIBLES = [
  { value: 'Collègues CACEM', icon: '👥' },
  { value: 'Scolaire / Jeune public', icon: '🎓' },
  { value: 'Grand public', icon: '👨‍👩‍👧‍👦' },
  { value: 'Entreprises / Administrations', icon: '🏢' },
  { value: 'Associations', icon: '🤝' },
  { value: 'Villes membres', icon: '🏛️' }
];

// Fonctions de navigation
const getSectionIcon = (section) => {
  const icons = {
    [FORM_SECTIONS.GENERAL]: '📝',
    [FORM_SECTIONS.ACTION]: '🎯',
    [FORM_SECTIONS.LOGISTIQUE]: '🚚',
    [FORM_SECTIONS.VALIDATION]: '✓'
  };
  return icons[section] || '📋';
};

const isSectionCompleted = (section) => {
  switch (section) {
    case FORM_SECTIONS.GENERAL:
      return form.value.intitule && form.value.responsable && form.value.email;
    case FORM_SECTIONS.ACTION:
      return form.value.typeAction && 
             form.value.thematiques.length > 0 && 
             form.value.objectifs && 
             form.value.description && 
             form.value.publicsCibles.length > 0;
    case FORM_SECTIONS.LOGISTIQUE:
      return form.value.dateAction && form.value.materiel;
    case FORM_SECTIONS.VALIDATION:
      return isFormValid.value;
    default:
      return false;
  }
};

// Navigation entre les sections
const isCurrentSectionValid = computed(() => {
  switch (currentSection.value) {
    case FORM_SECTIONS.GENERAL:
      return form.value.intitule && form.value.responsable && form.value.email;
    case FORM_SECTIONS.ACTION:
      return form.value.typeAction && 
             form.value.thematiques.length > 0 && 
             form.value.objectifs && 
             form.value.description && 
             form.value.publicsCibles.length > 0;
    case FORM_SECTIONS.LOGISTIQUE:
      return form.value.dateAction && form.value.materiel;
    case FORM_SECTIONS.VALIDATION:
      return isFormValid.value;
    default:
      return false;
  }
});

const navigateToSection = (section) => {
  if (section === currentSection.value) return;
  
  // Vérifier si on peut naviguer vers la section demandée
  const sections = Object.values(FORM_SECTIONS);
  const currentIndex = sections.indexOf(currentSection.value);
  const targetIndex = sections.indexOf(section);
  
  // Permettre la navigation vers les sections précédentes ou la section suivante si la section actuelle est valide
  if (targetIndex < currentIndex || isCurrentSectionValid.value) {
    currentSection.value = section;
  } else {
    showNotification('warning', 'Attention', 'Veuillez compléter la section actuelle avant de continuer');
  }
};

const navigateToNextSection = () => {
  const sections = Object.values(FORM_SECTIONS);
  const currentIndex = sections.indexOf(currentSection.value);
  if (currentIndex < sections.length - 1 && isCurrentSectionValid.value) {
    currentSection.value = sections[currentIndex + 1];
  }
};

const navigateToPreviousSection = () => {
  const sections = Object.values(FORM_SECTIONS);
  const currentIndex = sections.indexOf(currentSection.value);
  if (currentIndex > 0) {
    currentSection.value = sections[currentIndex - 1];
  }
};

// Gestion des sélections multiples
const toggleThematique = (thematique) => {
  const index = form.value.thematiques.indexOf(thematique);
  if (index === -1) {
    form.value.thematiques.push(thematique);
  } else {
    form.value.thematiques.splice(index, 1);
  }
  // Validation après modification
  validateField('thematiques', form.value.thematiques, validationRules.thematiques);
};

const togglePublicCible = (publicCible) => {
  const index = form.value.publicsCibles.indexOf(publicCible);
  if (index === -1) {
    form.value.publicsCibles.push(publicCible);
  } else {
    form.value.publicsCibles.splice(index, 1);
  }
  // Validation après modification
  validateField('publicsCibles', form.value.publicsCibles, validationRules.publicsCibles);
};

// Composables
const useFormValidation = () => {
  const validationErrors = ref({});
  
  const validateField = (field, value, rules) => {
    validationErrors.value[field] = '';
    
    for (const rule of rules) {
      const error = rule(value);
      if (error) {
        validationErrors.value[field] = error;
        break;
      }
    }
  };

  const validateAllFields = () => {
    Object.entries(validationRules).forEach(([field, rules]) => {
      validateField(field, form.value[field], rules);
    });
  };

  const hasValidationErrors = computed(() => {
    return Object.values(validationErrors.value).some(error => error && error.length > 0);
  });

  const isFormValid = computed(() => {
    // Vérification des champs requis
    const requiredFields = {
      intitule: form.value.intitule?.trim(),
      responsable: form.value.responsable?.trim(),
      email: form.value.email?.trim(),
      typeAction: form.value.typeAction?.trim(),
      thematiques: form.value.thematiques?.length > 0,
      objectifs: form.value.objectifs?.trim(),
      description: form.value.description?.trim(),
      publicsCibles: form.value.publicsCibles?.length > 0,
      dateAction: form.value.dateAction,
      materiel: form.value.materiel?.trim(),
      besoinsHumains: form.value.besoinsHumains >= 1 && form.value.besoinsHumains <= 10
    };

    // Vérifier si tous les champs requis sont remplis
    const allFieldsFilled = Object.values(requiredFields).every(value => value);
    
    // Vérifier s'il n'y a pas d'erreurs de validation réelles
    const noValidationErrors = !hasValidationErrors.value;

    return allFieldsFilled && noValidationErrors;
  });

  return {
    validationErrors,
    isFormValid,
    validateField,
    validateAllFields,
    hasValidationErrors
  };
};

const useFormProgress = (form) => {
  const calculateProgress = computed(() => {
    const totalFields = Object.keys(form.value).length;
    const filledFields = Object.entries(form.value).filter(([_, value]) => {
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'string') return value.trim().length > 0;
      return value !== null && value !== undefined;
    }).length;
    
    return Math.round((filledFields / totalFields) * 100);
  });

  return {
    formProgress: calculateProgress
  };
};

// État du formulaire
const form = ref({
  dateDemande: new Date().toISOString().split('T')[0],
  intitule: '',
  responsable: '',
  email: '',
  programme: '',
  typeAction: '',
  thematiques: [],
  objectifs: '',
  description: '',
  publicsCibles: [],
  dateAction: '',
  horaire: '',
  lieu: '',
  besoinsHumains: 1,
  materiel: '',
  partenaires: '',
  autreTypeAction: '',
  autreThematique: ''
});

// État de l'application
const router = useRouter();
const loading = ref(false);
const currentSection = ref(FORM_SECTIONS.GENERAL);
const showSuccessModal = ref(false);
const showErrorModal = ref(false);
const modalMessage = ref('');

// Règles de validation
const validationRules = {
  email: [
    (v) => !v && 'L\'email est requis',
    (v) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && 'Email invalide'
  ],
  dateAction: [
    (v) => !v && 'La date est requise',
    (v) => new Date(v) < new Date() && 'La date doit être dans le futur'
  ],
  thematiques: [
    (v) => (!v || v.length === 0) && 'Au moins une thématique est requise'
  ],
  publicsCibles: [
    (v) => (!v || v.length === 0) && 'Au moins un public cible est requis'
  ],
  objectifs: [
    (v) => (!v || v.trim().length === 0) && 'Les objectifs sont requis'
  ],
  description: [
    (v) => (!v || v.trim().length === 0) && 'La description est requise'
  ],
  materiel: [
    (v) => (!v || v.trim().length === 0) && 'Le matériel est requis'
  ],
  besoinsHumains: [
    (v) => !v && 'Le nombre de personnes est requis',
    (v) => isNaN(v) && 'Doit être un nombre',
    (v) => v < 1 && 'Minimum 1 personne',
    (v) => v > 10 && 'Maximum 10 personnes'
  ],
  intitule: [
    (v) => (!v || v.trim().length === 0) && 'L\'intitulé est requis'
  ],
  responsable: [
    (v) => (!v || v.trim().length === 0) && 'Le responsable est requis'
  ],
  typeAction: [
    (v) => (!v || v.trim().length === 0) && 'Le type d\'action est requis'
  ]
};

// Composables
const { validationErrors, isFormValid, validateField, validateAllFields, hasValidationErrors } = useFormValidation();
const { formProgress } = useFormProgress(form);

// Watchers pour la validation en temps réel
watch(() => form.value, () => {
  validateAllFields();
}, { deep: true });

// Initialisation de Keycloak avec meilleure gestion des erreurs
const initKeycloak = async () => {
  try {
    console.log('Initialisation de Keycloak...');
    if (!keycloak.authenticated) {
      console.log('Non authentifié, tentative de login...');
      await keycloak.init({
        onLoad: 'login-required',
        checkLoginIframe: false,
        silentCheckSsoRedirectUri: `${window.location.origin}`,
        pkceMethod: 'S256'
      });
    }
    
    console.log('État de l\'authentification Keycloak:', keycloak.authenticated);
    if (keycloak.authenticated) {
      const tokenData = keycloak.tokenParsed;
      console.log('Données du token Keycloak:', {
        email: tokenData.email,
        given_name: tokenData.given_name,
        family_name: tokenData.family_name,
        name: tokenData.name
      });

      // Remplissage direct des champs avec les données du token
      if (tokenData.name) {
        form.value.responsable = tokenData.name;
      } else if (tokenData.given_name && tokenData.family_name) {
        form.value.responsable = `${tokenData.given_name} ${tokenData.family_name}`;
      }

      if (tokenData.email) {
        form.value.email = tokenData.email;
      }

      console.log('Formulaire pré-rempli avec les données Keycloak:', {
        responsable: form.value.responsable,
        email: form.value.email
      });
    }
  } catch (err) {
    console.error('Erreur Keycloak :', err);
    showNotification('error', 'Erreur', `Erreur d'initialisation : ${err.message}`);
  }
};

// Ajoutons une fonction de débogage pour la validation
const debugValidation = computed(() => {
  const requiredFields = {
    intitule: { value: form.value.intitule?.trim(), valid: Boolean(form.value.intitule?.trim()) },
    responsable: { value: form.value.responsable?.trim(), valid: Boolean(form.value.responsable?.trim()) },
    email: { value: form.value.email?.trim(), valid: Boolean(form.value.email?.trim()) },
    typeAction: { value: form.value.typeAction?.trim(), valid: Boolean(form.value.typeAction?.trim()) },
    thematiques: { value: form.value.thematiques, valid: form.value.thematiques?.length > 0 },
    objectifs: { value: form.value.objectifs?.trim(), valid: Boolean(form.value.objectifs?.trim()) },
    description: { value: form.value.description?.trim(), valid: Boolean(form.value.description?.trim()) },
    publicsCibles: { value: form.value.publicsCibles, valid: form.value.publicsCibles?.length > 0 },
    dateAction: { value: form.value.dateAction, valid: Boolean(form.value.dateAction) },
    materiel: { value: form.value.materiel?.trim(), valid: Boolean(form.value.materiel?.trim()) },
    besoinsHumains: { value: form.value.besoinsHumains, valid: form.value.besoinsHumains >= 1 && form.value.besoinsHumains <= 10 }
  };

  return {
    fields: requiredFields,
    allFieldsValid: Object.values(requiredFields).every(field => field.valid),
    hasValidationErrors: Object.keys(validationErrors.value).length > 0,
    validationErrors: validationErrors.value,
    isFormValid: isFormValid.value
  };
});

// Fonctions utilitaires
const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const validateHoraire = (horaire) => {
  if (!horaire) return true;
  const horaireRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return horaireRegex.test(horaire) || 'Format horaire invalide (HH:MM)';
};

// Gestion des notifications
const showNotification = (type, title, message) => {
  ElNotification({
    type,
    title,
    message,
    duration: 5000,
    position: 'top-right'
  });
};

// Initialisation du socket
const socket = io(import.meta.env.VITE_API_URL, {
  transports: ['websocket'],
  withCredentials: true
});

// Gestion des emails
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

// Gestion de la soumission
const handleSubmit = async () => {
  if (!isFormValid.value) {
    showNotification('warning', 'Attention', 'Veuillez corriger les erreurs dans le formulaire');
    return;
  }

  loading.value = true;
  try {
    // Récupérer l'ID utilisateur depuis Keycloak
    const userId = keycloak.tokenParsed?.sub;
    if (!userId) {
      throw new Error('ID utilisateur non trouvé');
    }

    // Préparer les données pour l'envoi
    const demandeData = {
      ...form.value,
      userId: parseInt(userId.split('-')[0], 16) || 1
    };

    const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/demandes`, demandeData);

    if (res.data) {
      // On envoie les emails de manière non-bloquante
      sendConfirmationEmails();
      showSuccessModal.value = true;
      resetForm();
    }
  } catch (err) {
    console.error('Erreur lors de la soumission :', err);
    showNotification('error', 'Erreur', err?.response?.data?.error || err?.message || "Erreur lors de la soumission");
    showErrorModal.value = true;
    modalMessage.value = "Une erreur est survenue lors de l'enregistrement de votre demande. Veuillez réessayer.";
  } finally {
    loading.value = false;
  }
};

const sendConfirmationEmails = async () => {
  const resumeUser = generateUserEmailContent();
  const resumeAdmin = generateAdminEmailContent();

  // Envoi des emails de manière non-bloquante
  Promise.all([
    sendMail(form.value.email, 'Confirmation de votre demande d\'intervention', resumeUser),
    sendMail('maric.ursulet@cacem-mq.com', 'Nouvelle demande d\'intervention reçue', resumeAdmin)
  ]).catch(error => {
    console.error('Erreur lors de l\'envoi des emails (non bloquante):', error);
    // On affiche une notification mais on ne bloque pas l'application
    showNotification('warning', 'Information', "La demande a été enregistrée mais il y a eu une erreur lors de l'envoi des emails de confirmation.");
  });
};

const generateUserEmailContent = () => {
  const baseUrl = window.location.origin;
  return `
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 24px; box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #0f214d; margin: 0; font-size: 24px;">Confirmation de votre demande d'intervention</h2>
      </div>

      <div style="background: rgba(15, 33, 77, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="color: #0f214d; margin-top: 0; font-size: 18px;">Résumé de votre demande</h3>
        <div style="display: grid; gap: 15px;">
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Intitulé :</strong>
            <span style="color: #333;">${form.value.intitule}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Responsable :</strong>
            <span style="color: #333;">${form.value.responsable}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Type d'action :</strong>
            <span style="color: #333;">${form.value.typeAction}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Date :</strong>
            <span style="color: #333;">${formatDate(form.value.dateAction)}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #666; margin-bottom: 20px;">Votre demande a bien été prise en compte. Vous pouvez suivre son évolution sur la plateforme.</p>
        <a href="${baseUrl}/suivi" style="display: inline-block; background: #0f214d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s ease;">Suivre ma demande</a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(15, 33, 77, 0.1);">
        <p style="color: #666; font-size: 14px; margin: 0;">Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <a href="mailto:maric.ursulet@cacem-mq.com" style="color: #0f214d; text-decoration: none; font-weight: 600;">maric.ursulet@cacem-mq.com</a>
      </div>
    </div>
  `;
};

const generateAdminEmailContent = () => {
  const baseUrl = window.location.origin;
  return `
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff; border-radius: 24px; box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h2 style="color: #0f214d; margin: 0; font-size: 24px;">Nouvelle demande d'intervention</h2>
      </div>

      <div style="background: rgba(15, 33, 77, 0.05); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
        <h3 style="color: #0f214d; margin-top: 0; font-size: 18px;">Détails de la demande</h3>
        <div style="display: grid; gap: 15px;">
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Intitulé :</strong>
            <span style="color: #333;">${form.value.intitule}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Responsable :</strong>
            <span style="color: #333;">${form.value.responsable}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Email :</strong>
            <span style="color: #333;">${form.value.email}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Date demande :</strong>
            <span style="color: #333;">${formatDate(form.value.dateDemande)}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Date action :</strong>
            <span style="color: #333;">${formatDate(form.value.dateAction)}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Type d'action :</strong>
            <span style="color: #333;">${form.value.typeAction}</span>
          </div>
          <div style="display: flex; gap: 10px;">
            <strong style="color: #0f214d; min-width: 120px;">Thématiques :</strong>
            <span style="color: #333;">${form.value.thematiques.join(', ')}</span>
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${baseUrl}/admin" style="display: inline-block; background: #0f214d; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s ease;">Gérer la demande</a>
      </div>

      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(15, 33, 77, 0.1);">
        <p style="color: #666; font-size: 14px; margin: 0;">Pour plus de détails, consultez la plateforme d'administration.</p>
      </div>
    </div>
  `;
};

const resetForm = () => {
  form.value = {
    dateDemande: new Date().toISOString().split('T')[0],
    intitule: '',
    responsable: '',
    email: '',
    programme: '',
    typeAction: '',
    thematiques: [],
    objectifs: '',
    description: '',
    publicsCibles: [],
    dateAction: '',
    horaire: '',
    lieu: '',
    besoinsHumains: 1,
    materiel: '',
    partenaires: '',
    autreTypeAction: '',
    autreThematique: ''
  };
};

// Navigation
const goToHome = () => router.push('/');
const closeErrorModal = () => {
  showErrorModal.value = false;
  modalMessage.value = '';
};

onMounted(() => {
  initKeycloak();
});
</script>

<template>
  <div class="demande-bg">
    <div class="demande-container">
      <!-- En-tête avec navigation par étapes -->
      <div class="form-header">
        <h2 class="demande-title">
          <img src="/liste-de-controle.png" alt="Liste de contrôle" class="title-icon" />
          Demande d'intervention
        </h2>
        
        <!-- Navigation par étapes -->
        <div class="steps-navigation">
          <div 
            v-for="(section, key) in FORM_SECTIONS" 
            :key="key"
            class="step-item"
            :class="{ 
              'active': currentSection === section,
              'completed': isSectionCompleted(section)
            }"
            @click="navigateToSection(section)"
          >
            <span class="step-icon">{{ getSectionIcon(section) }}</span>
            <span class="step-label">{{ section }}</span>
          </div>
        </div>

        <!-- Barre de progression -->
        <div class="progress-container">
          <div class="progress" :style="{ width: `${formProgress}%` }"></div>
          <span class="progress-text">{{ formProgress }}% complété</span>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" novalidate class="needs-validation glass-card">
        <!-- Section Informations générales -->
        <div v-show="currentSection === FORM_SECTIONS.GENERAL" class="form-section">
          <h3 class="section-title">Informations générales</h3>
          <div class="row g-4">
            <div class="col-md-6">
              <label for="dateDemande" class="form-label required">
                <i class="fas fa-calendar"></i> Date de la demande
              </label>
              <input 
                type="date" 
                v-model="form.dateDemande" 
                id="dateDemande" 
                class="form-control glass-input" 
                readonly 
                disabled
              />
            </div>

            <div class="col-md-6">
              <label for="intitule" class="form-label required">
                <i class="fas fa-heading"></i> Intitulé de l'action
              </label>
              <input 
                type="text" 
                v-model="form.intitule" 
                id="intitule" 
                class="form-control glass-input" 
                :class="{ 'is-invalid': validationErrors.intitule }"
                required 
                placeholder="Ex. : Animation quartier Trénelle" 
              />
              <div class="invalid-feedback" v-if="validationErrors.intitule">
                {{ validationErrors.intitule }}
              </div>
            </div>

            <div class="col-md-6">
              <label for="responsable" class="form-label required">
                <i class="fas fa-user"></i> Personne en charge
              </label>
              <input 
                type="text" 
                v-model="form.responsable" 
                id="responsable" 
                class="form-control glass-input" 
                required 
              />
            </div>

            <div class="col-md-6">
              <label for="email" class="form-label required">
                <i class="fas fa-envelope"></i> Email du demandeur
              </label>
              <input 
                type="email" 
                v-model="form.email" 
                id="email" 
                class="form-control glass-input"
                :class="{ 'is-invalid': validationErrors.email }"
                required
                placeholder="email@exemple.com" 
              />
              <div class="invalid-feedback" v-if="validationErrors.email">
                {{ validationErrors.email }}
              </div>
            </div>

            <div class="col-md-6">
              <label for="programme" class="form-label">
                <i class="fas fa-folder"></i> Programme associé
              </label>
              <input 
                type="text" 
                v-model="form.programme" 
                id="programme" 
                class="form-control glass-input" 
              />
            </div>
          </div>
        </div>

        <!-- Section Détails de l'action -->
        <div v-show="currentSection === FORM_SECTIONS.ACTION" class="form-section">
          <h3 class="section-title">Détails de l'action</h3>
          <div class="row g-4">
            <div class="col-md-6">
              <label class="form-label required">
                <i class="fas fa-bullseye"></i> Type d'action
              </label>
              <select 
                v-model="form.typeAction" 
                class="form-select glass-input" 
                :class="{ 'is-invalid': validationErrors.typeAction }"
                required
              >
                <option disabled value="">Sélectionnez une option</option>
                <option v-for="type in TYPE_ACTIONS" :key="type.value" :value="type.value">
                  {{ type.icon }} {{ type.value }}
                </option>
              </select>
              <div class="invalid-feedback" v-if="validationErrors.typeAction">
                {{ validationErrors.typeAction }}
              </div>
            </div>

            <div class="col-12">
              <label class="form-label required">
                <i class="fas fa-tags"></i> Thématique(s)
              </label>
              <div class="thematiques-grid">
                <div 
                  v-for="theme in THEMATIQUES" 
                  :key="theme.value"
                  class="thematique-item"
                  :class="{ 'selected': form.thematiques.includes(theme.value) }"
                  @click="toggleThematique(theme.value)"
                >
                  <span class="thematique-icon">{{ theme.icon }}</span>
                  <span class="thematique-label">{{ theme.value }}</span>
                </div>
              </div>
              <div class="invalid-feedback" v-if="validationErrors.thematiques">
                {{ validationErrors.thematiques }}
              </div>
            </div>

            <div class="col-12">
              <label class="form-label required">
                <i class="fas fa-bullseye"></i> Objectifs de l'action
              </label>
              <textarea 
                v-model="form.objectifs" 
                class="form-control glass-input" 
                rows="3" 
                required
                :class="{ 'is-invalid': validationErrors.objectifs }"
                placeholder="Décrivez les objectifs de votre action..."
              ></textarea>
              <div class="invalid-feedback" v-if="validationErrors.objectifs">
                {{ validationErrors.objectifs }}
              </div>
            </div>

            <div class="col-12">
              <label class="form-label required">
                <i class="fas fa-align-left"></i> Description de l'action
              </label>
              <textarea 
                v-model="form.description" 
                class="form-control glass-input" 
                rows="4" 
                required
                :class="{ 'is-invalid': validationErrors.description }"
                placeholder="Décrivez en détail votre action..."
              ></textarea>
              <div class="invalid-feedback" v-if="validationErrors.description">
                {{ validationErrors.description }}
              </div>
            </div>

            <div class="col-12">
              <label class="form-label required">
                <i class="fas fa-users"></i> Public(s)-cible(s)
              </label>
              <div class="publics-grid">
                <div 
                  v-for="publicCible in PUBLICS_CIBLES" 
                  :key="publicCible.value"
                  class="public-item"
                  :class="{ 'selected': form.publicsCibles.includes(publicCible.value) }"
                  @click="togglePublicCible(publicCible.value)"
                >
                  <span class="public-icon">{{ publicCible.icon }}</span>
                  <span class="public-label">{{ publicCible.value }}</span>
                </div>
              </div>
              <div class="invalid-feedback" v-if="validationErrors.publicsCibles">
                {{ validationErrors.publicsCibles }}
              </div>
            </div>
          </div>
        </div>

        <!-- Section Logistique -->
        <div v-show="currentSection === FORM_SECTIONS.LOGISTIQUE" class="form-section">
          <h3 class="section-title">Logistique</h3>
          <div class="row g-4">
            <div class="col-md-4">
              <label class="form-label required">
                <i class="fas fa-calendar-alt"></i> Date de l'action
              </label>
              <div class="input-group date-input-group">
                <input 
                  type="date" 
                  v-model="form.dateAction" 
                  class="form-control glass-input date-input" 
                  required 
                  :min="new Date().toISOString().split('T')[0]"
                  :class="{ 'is-invalid': validationErrors.dateAction }"
                />
                <span class="input-group-text date-icon">
                  <i class="fas fa-calendar"></i>
                </span>
              </div>
              <div class="invalid-feedback" v-if="validationErrors.dateAction">
                {{ validationErrors.dateAction }}
              </div>
              <small class="form-text text-muted" v-if="form.dateAction">
                {{ formatDate(form.dateAction) }}
              </small>
            </div>

            <div class="col-md-4">
              <label class="form-label">
                <i class="fas fa-clock"></i> Horaire d'intervention
              </label>
              <div class="input-group">
                <input 
                  type="time" 
                  v-model="form.horaire" 
                  class="form-control glass-input"
                  :class="{ 'is-invalid': validationErrors.horaire }"
                  step="900"
                  placeholder="HH:MM"
                />
                <span class="input-group-text">
                  <i class="fas fa-clock"></i>
                </span>
              </div>
              <div class="invalid-feedback" v-if="validationErrors.horaire">
                {{ validationErrors.horaire }}
              </div>
              <small class="form-text text-muted">Format 24h (ex: 14:30)</small>
            </div>

            <div class="col-md-4">
              <label class="form-label">
                <i class="fas fa-map-marker-alt"></i> Lieu
              </label>
              <input 
                type="text" 
                v-model="form.lieu" 
                class="form-control glass-input"
                placeholder="Adresse ou lieu précis"
              />
            </div>

            <div class="col-12">
              <label class="form-label required">
                <i class="fas fa-users"></i> Besoins humains ACV
              </label>
              <div class="input-group">
                <input 
                  type="number" 
                  v-model.number="form.besoinsHumains" 
                  class="form-control glass-input"
                  :class="{ 'is-invalid': validationErrors.besoinsHumains }"
                  min="1"
                  max="10"
                  required
                />
                <span class="input-group-text">personnes</span>
              </div>
              <div class="invalid-feedback" v-if="validationErrors.besoinsHumains">
                {{ validationErrors.besoinsHumains }}
              </div>
              <small class="form-text text-muted">Nombre de personnes nécessaires (1-10)</small>
            </div>

            <div class="col-12">
              <label class="form-label required">
                <i class="fas fa-tools"></i> Matériel mis à disposition
              </label>
              <textarea 
                v-model="form.materiel" 
                class="form-control glass-input" 
                rows="3" 
                required
                :class="{ 'is-invalid': validationErrors.materiel }"
                placeholder="Listez le matériel nécessaire..."
              ></textarea>
              <div class="invalid-feedback" v-if="validationErrors.materiel">
                {{ validationErrors.materiel }}
              </div>
            </div>

            <div class="col-12">
              <label class="form-label">
                <i class="fas fa-handshake"></i> Partenaires associés
              </label>
              <input 
                type="text" 
                v-model="form.partenaires" 
                class="form-control glass-input"
                placeholder="Listez les partenaires impliqués..."
              />
            </div>
          </div>
        </div>

        <!-- Section Validation -->
        <div v-show="currentSection === FORM_SECTIONS.VALIDATION" class="form-section">
          <h3 class="section-title">Validation</h3>
          <div class="validation-summary">
            <h4>Récapitulatif de votre demande</h4>
            <div class="summary-content">
              <div class="summary-item">
                <strong>Intitulé :</strong>
                <span>{{ form.intitule }}</span>
              </div>
              <div class="summary-item">
                <strong>Responsable :</strong>
                <span>{{ form.responsable }}</span>
              </div>
              <div class="summary-item">
                <strong>Type d'action :</strong>
                <span>{{ form.typeAction }}</span>
              </div>
              <div class="summary-item">
                <strong>Date de l'action :</strong>
                <span>{{ formatDate(form.dateAction) }}</span>
              </div>
              <div class="summary-item">
                <strong>Thématiques :</strong>
                <span>{{ form.thematiques.join(', ') }}</span>
              </div>
              <div class="summary-item">
                <strong>Publics cibles :</strong>
                <span>{{ form.publicsCibles.join(', ') }}</span>
              </div>
            </div>
          </div>
          <div v-if="currentSection === FORM_SECTIONS.VALIDATION" class="debug-info" style="margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-radius: 8px; font-size: 12px;">
            <h4>État de la validation :</h4>
            <pre>{{ JSON.stringify(debugValidation, null, 2) }}</pre>
          </div>
        </div>

        <!-- Navigation entre les sections -->
        <div class="form-navigation">
          <button 
            v-if="currentSection !== FORM_SECTIONS.GENERAL"
            type="button" 
            class="btn-nav btn-prev"
            @click="navigateToPreviousSection"
          >
            <i class="fas fa-arrow-left"></i> Précédent
          </button>
          
          <button 
            v-if="currentSection !== FORM_SECTIONS.VALIDATION"
            type="button" 
            class="btn-nav btn-next"
            @click="navigateToNextSection"
            :disabled="!isCurrentSectionValid"
          >
            Suivant <i class="fas fa-arrow-right"></i>
          </button>

          <button 
            v-if="currentSection === FORM_SECTIONS.VALIDATION"
            type="submit" 
            class="btn-submit"
            :disabled="!isFormValid || loading"
            :class="{ 'btn-loading': loading, 'btn-enabled': isFormValid }"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
            {{ loading ? 'Envoi en cours...' : 'Soumettre la demande' }}
          </button>
        </div>
      </form>

      <!-- Modals -->
      <Teleport to="body">
        <!-- Modal de succès -->
        <div v-if="showSuccessModal" class="modal-overlay">
          <div class="modal-content success-modal">
            <div class="modal-header">
              <i class="fas fa-check-circle success-icon"></i>
              <h3>Demande enregistrée</h3>
            </div>
            <div class="modal-body">
              <p>Votre demande a été enregistrée avec succès.</p>
              <p>Vous pouvez suivre son statut dans la section "Suivi".</p>
            </div>
            <div class="modal-footer">
              <button @click="goToHome" class="btn-glass">
                Retour à l'accueil
              </button>
            </div>
          </div>
        </div>

        <!-- Modal d'erreur -->
        <div v-if="showErrorModal" class="modal-overlay">
          <div class="modal-content error-modal">
            <div class="modal-header">
              <i class="fas fa-exclamation-circle error-icon"></i>
              <h3>Attention</h3>
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
    </div>
  </div>
</template>

<style scoped>
/* Styles de base */
.demande-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #e3e9f7 0%, #ffffff 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  position: relative;
  overflow-x: hidden;
}

.demande-container {
  width: 100%;
  max-width: 1200px;
  margin-top: 80px;
}

/* En-tête et navigation */
.form-header {
  margin-bottom: 2rem;
  text-align: center;
}

.demande-title {
  color: #0f214d;
  font-size: 2.1rem;
  font-weight: 800;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
}

.title-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
}

/* Navigation par étapes */
.steps-navigation {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem 1.2rem;
  border-radius: 25px;
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(15, 33, 77, 0.1);
}

.step-item:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.9);
}

.step-item.active {
  background: #0f214d;
  color: white;
}

.step-item.completed {
  background: #4CAF50;
  color: white;
}

.step-icon {
  font-size: 1.2rem;
}

/* Barre de progression */
.progress-container {
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 4px;
  margin: 1rem 0;
  position: relative;
  overflow: hidden;
}

.progress {
  height: 100%;
  background: linear-gradient(90deg, #0f214d 0%, #4a90e2 100%);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  right: 0;
  top: -20px;
  font-size: 0.9rem;
  color: #0f214d;
  font-weight: 500;
}

/* Formulaire */
.glass-card {
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(16px);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 2rem;
  margin-bottom: 2rem;
}

.form-section {
  animation: fadeIn 0.5s ease-out;
}

.section-title {
  color: #0f214d;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(15, 33, 77, 0.1);
}

/* Grilles pour les sélections multiples */
.thematiques-grid,
.publics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.thematique-item,
.public-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.8rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(15, 33, 77, 0.1);
}

.thematique-item:hover,
.public-item:hover {
  transform: translateY(-2px);
  background: rgba(255, 255, 255, 0.9);
}

.thematique-item.selected,
.public-item.selected {
  background: #0f214d;
  color: white;
}

.thematique-icon,
.public-icon {
  font-size: 1.2rem;
}

/* Navigation du formulaire */
.form-navigation {
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(15, 33, 77, 0.1);
}

.btn-nav {
  padding: 0.8rem 1.5rem;
  border-radius: 25px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-prev {
  background: rgba(15, 33, 77, 0.1);
  color: #0f214d;
}

.btn-next {
  background: #0f214d;
  color: white;
}

.btn-nav:hover:not(:disabled) {
  transform: translateY(-2px);
}

.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Bouton de soumission */
.btn-submit {
  background: #cccccc;
  color: white;
  padding: 1rem 2rem;
  border-radius: 25px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
}

.btn-submit.btn-enabled {
  background: #4CAF50;
  cursor: pointer;
}

.btn-submit.btn-enabled:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Récapitulatif */
.validation-summary {
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
}

.summary-content {
  display: grid;
  gap: 1rem;
}

.summary-item {
  display: flex;
  gap: 1rem;
  padding: 0.5rem;
  border-bottom: 1px solid rgba(15, 33, 77, 0.1);
}

.summary-item:last-child {
  border-bottom: none;
}

.summary-item strong {
  min-width: 150px;
  color: #0f214d;
}

/* Modals */
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
  background: white;
  border-radius: 24px;
  width: 90%;
  max-width: 400px;
  animation: modalSlide 0.3s ease-out;
}

.modal-header {
  padding: 1.5rem;
  text-align: center;
  border-bottom: 1px solid rgba(15, 33, 77, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.success-icon {
  color: #4CAF50;
  font-size: 2rem;
}

.error-icon {
  color: #f44336;
  font-size: 2rem;
}

.modal-body {
  padding: 1.5rem;
  text-align: center;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid rgba(15, 33, 77, 0.1);
  text-align: center;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes modalSlide {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .demande-container {
    margin-top: 60px;
    padding: 0 1rem;
  }

  .demande-title {
    font-size: 1.8rem;
  }

  .steps-navigation {
    flex-direction: column;
    align-items: stretch;
  }

  .step-item {
    justify-content: center;
  }

  .glass-card {
    padding: 1.5rem;
  }

  .thematiques-grid,
  .publics-grid {
    grid-template-columns: 1fr;
  }

  .form-navigation {
    flex-direction: column;
    gap: 1rem;
  }

  .btn-nav {
    width: 100%;
    justify-content: center;
  }
}

/* Utilitaires */
.required::after {
  content: '*';
  color: #f44336;
  margin-left: 0.25rem;
}

.form-text {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.invalid-feedback {
  color: #f44336;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

/* Améliorations des inputs */
.glass-input {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(15, 33, 77, 0.1);
  border-radius: 12px;
  padding: 0.8rem 1rem;
  transition: all 0.3s ease;
}

.glass-input:focus {
  background: rgba(255, 255, 255, 0.9);
  border-color: #0f214d;
  box-shadow: 0 0 0 3px rgba(15, 33, 77, 0.1);
  outline: none;
}

.glass-input.is-invalid {
  border-color: #f44336;
  background-color: rgba(244, 67, 54, 0.05);
}

/* Range slider personnalisé */
.range-slider-container {
  position: relative;
  padding: 1rem 0;
}

.custom-range {
  width: 100%;
  height: 6px;
  -webkit-appearance: none;
  background: rgba(15, 33, 77, 0.1);
  border-radius: 3px;
  outline: none;
}

.custom-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: #0f214d;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s ease;
}

.custom-range::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.range-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  color: #666;
  font-size: 0.875rem;
}

.input-group {
  display: flex;
  align-items: center;
}

.input-group .form-control {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.input-group .input-group-text {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(15, 33, 77, 0.1);
  border-left: none;
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
  color: #0f214d;
  font-weight: 500;
}

.debug-info {
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-all;
}

.debug-info pre {
  margin: 0;
  padding: 0.5rem;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ddd;
}
</style>




















