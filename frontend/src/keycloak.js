import Keycloak from 'keycloak-js';

const keycloakConfig = {
  url: import.meta.env.VITE_KEYCLOAK_URL || 'https://svrkeycloak.agglo.local:8443',
  realm: import.meta.env.VITE_KEYCLOAK_REALM || 'CACEM',
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'AVC',
  redirectUri: import.meta.env.VITE_KEYCLOAK_REDIRECT_URI || window.location.origin,
  onLoad: 'check-sso',
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
  pkceMethod: 'S256'
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak; 