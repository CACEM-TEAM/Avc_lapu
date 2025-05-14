import Keycloak from 'keycloak-js';

const keycloakConfig = {
  "realm": "CACEM",
  "url": "https://svrkeycloak.agglo.local:8443",
  "clientId": "AVC"
};

const keycloak = new Keycloak(keycloakConfig);

export default keycloak; // Exportez directement l'instance de Keycloak
