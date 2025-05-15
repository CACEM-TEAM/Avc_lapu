-- Créer la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS acv_demande;

-- Accorder tous les privilèges à l'utilisateur app_user sur la base de données acv_demande
GRANT ALL PRIVILEGES ON acv_demande.* TO 'app_user'@'%';

-- Appliquer les changements
FLUSH PRIVILEGES; 