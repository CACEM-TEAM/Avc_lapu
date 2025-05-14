import { defineStore } from 'pinia';
import keycloak from '../keycloak';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    userEmail: null,
    token: null,
    loading: true,
    error: null
  }),

  actions: {
    async initAuth() {
      try {
        this.loading = true;
        await keycloak.init({
          onLoad: 'check-sso',
          silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
          pkceMethod: 'S256'
        });

        if (keycloak.authenticated) {
          this.isAuthenticated = true;
          this.userEmail = keycloak.tokenParsed.email;
          this.token = keycloak.token;
        }
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'authentification:', error);
        this.error = error.message;
      } finally {
        this.loading = false;
      }
    },

    async refreshToken() {
      try {
        if (keycloak.authenticated) {
          const refreshed = await keycloak.updateToken(70);
          if (refreshed) {
            this.token = keycloak.token;
          }
          return this.token;
        }
        throw new Error('Non authentifié');
      } catch (error) {
        console.error('Erreur lors du rafraîchissement du token:', error);
        this.error = error.message;
        throw error;
      }
    },

    async logout() {
      try {
        await keycloak.logout();
        this.isAuthenticated = false;
        this.userEmail = null;
        this.token = null;
      } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        this.error = error.message;
      }
    }
  }
}); 