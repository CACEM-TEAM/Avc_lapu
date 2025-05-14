require('dotenv').config(); // Charge les variables .env

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http');
const { Server } = require('socket.io');
const axiosLib = require('axios');
const https = require('https');
const agent = new https.Agent({ rejectUnauthorized: false });

const app = express();

// Configuration CORS flexible selon la variable d'environnement
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['*'],
  credentials: false,
  exposedHeaders: ['*']
}));

app.use(bodyParser.json());

// Configuration de l'email du validateur
const VALIDATOR_EMAIL = process.env.VALIDATOR_EMAIL || 'maric.ursulet@cacem-mq.com';

// Configuration de l'API mailer
const MAILER_API_URL = process.env.MAILER_API_URL || 'https://svrapi.agglo.local/mailer';

// Route de santé pour le healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Connexion MySQL avec .env
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
  

// GET : Récupérer les demandes par email
app.get('/api/demandes/email/:email', async (req, res) => {
  try {
    console.log('Récupération des demandes pour email:', req.params.email);
    const [rows] = await db.execute(
      'SELECT *, DATE_FORMAT(date_demande, "%Y-%m-%d") as dateDemande, DATE_FORMAT(date_action, "%Y-%m-%d") as dateAction FROM demandes WHERE email = ? ORDER BY date_demande DESC',
      [req.params.email]
    );
    console.log('Demandes trouvées:', rows);
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT : Annuler une demande
app.put('/api/demandes/:id/annuler', async (req, res) => {
  try {
    console.log('Début de l\'annulation de la demande:', req.params.id);
    
    // Récupérer la demande avant de la mettre à jour
    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [req.params.id]);
    const demande = rows[0];
    
    if (!demande) {
      console.log('Demande non trouvée:', req.params.id);
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    // Vérifier si la demande n'est pas déjà annulée
    if (demande.statut === 'annulee') {
      console.log('La demande est déjà annulée:', req.params.id);
      return res.status(400).json({ error: 'La demande est déjà annulée' });
    }

    // Mettre à jour le statut
    const [updateResult] = await db.execute(
      'UPDATE demandes SET statut = "annulee" WHERE id = ?',
      [req.params.id]
    );

    if (updateResult.affectedRows === 0) {
      console.log('Échec de la mise à jour de la demande:', req.params.id);
      return res.status(500).json({ error: 'Échec de la mise à jour de la demande' });
    }

    console.log('Demande annulée avec succès:', req.params.id);

    // Envoi des emails de manière non-bloquante et séparée
    try {
      // Mail à l'utilisateur
      const msgUser = `<b>Votre demande a été annulée.</b><br><b>Intitulé :</b> ${demande.intitule}<br><b>Date :</b> ${demande.date_demande}<br>`;
      await sendMail(
        demande.email,
        `Votre demande a été annulée : ${demande.intitule}`,
        msgUser
      ).catch(emailError => {
        console.error('Erreur lors de l\'envoi du mail utilisateur:', emailError);
      });

      // Mail à l'admin
      const msgAdmin = `<b>Une demande a été annulée</b><br><b>Intitulé :</b> ${demande.intitule}<br><b>Responsable :</b> ${demande.responsable}<br><b>Email :</b> ${demande.email}<br><b>Date :</b> ${demande.date_demande}<br>`;
      await sendMail(
        VALIDATOR_EMAIL,
        `Demande annulée : ${demande.intitule}`,
        msgAdmin
      );
    } catch (emailError) {
      // On log l'erreur mais on ne la propage pas car l'annulation a réussi
      console.error('Erreur lors de l\'envoi des emails (non bloquante):', emailError);
    }

    // Retourner le succès même si l'envoi des emails a échoué
    res.json({ 
      message: 'Demande annulée avec succès',
      demande: {
        id: demande.id,
        statut: 'annulee',
        intitule: demande.intitule
      }
    });
  } catch (error) {
    console.error('Erreur détaillée lors de l\'annulation de la demande:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de l\'annulation de la demande',
      details: error.message
    });
  }
});

// PUT : Modifier une demande
app.put('/api/demandes/:id', async (req, res) => {
  try {
    const {
      intitule,
      programme,
      typeAction,
      thematiques,
      objectifs,
      description,
      publicsCibles,
      dateAction,
      horaire,
      lieu,
      besoinsHumains,
      materiel,
      partenaires
    } = req.body;

    await db.execute(
      `UPDATE demandes SET 
        intitule = ?, programme = ?, type_action = ?, thematiques = ?,
        objectifs = ?, description = ?, publics_cibles = ?, date_action = ?,
        horaire = ?, lieu = ?, besoins_humains = ?, materiel = ?, partenaires = ?
      WHERE id = ?`,
      [
        intitule, programme, typeAction, JSON.stringify(thematiques),
        objectifs, description, JSON.stringify(publicsCibles), dateAction,
        horaire, lieu, besoinsHumains, materiel, partenaires,
        req.params.id
      ]
    );

    res.json({ message: 'Demande modifiée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la modification de la demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST : Enregistrer une demande
app.post('/api/demandes', async (req, res) => {
  try {
    console.log('--- Nouvelle demande reçue ---');
    console.log('Body reçu :', req.body);

    // Validation stricte des champs obligatoires
    const requiredFields = [
      'dateDemande', 'intitule', 'responsable', 'email', 'typeAction',
      'thematiques', 'objectifs', 'description', 'publicsCibles',
      'dateAction', 'materiel'
    ];
    for (const field of requiredFields) {
      if (!req.body[field] || (Array.isArray(req.body[field]) && req.body[field].length === 0)) {
        return res.status(400).json({ error: `Le champ '${field}' est obligatoire.` });
      }
    }

    // Vérification des types
    if (isNaN(Number(req.body.besoinsHumains))) {
      return res.status(400).json({ error: "Le champ 'besoinsHumains' doit être un nombre." });
    }

    // Extraction des champs
    const {
      userId = 1,
      dateDemande,
      intitule,
      responsable,
      email,
      programme,
      typeAction,
      thematiques,
      objectifs,
      description,
      publicsCibles,
      dateAction,
      horaire,
      lieu,
      besoinsHumains,
      materiel,
      partenaires
    } = req.body;

    const [result] = await db.execute(
      `INSERT INTO demandes (
        user_id, date_demande, intitule, responsable, email, programme,
        type_action, thematiques, objectifs, description, publics_cibles,
        date_action, horaire, lieu, besoins_humains, materiel, partenaires,
        statut
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en attente')`,
      [
        userId, dateDemande, intitule, responsable, email, programme,
        typeAction, JSON.stringify(thematiques), objectifs, description,
        JSON.stringify(publicsCibles), dateAction, horaire, lieu,
        Number(besoinsHumains), materiel, partenaires
      ]
    );

    res.status(201).json({ message: 'Demande enregistrée', id: result.insertId });
  } catch (error) {
    console.error('Erreur lors de la création de la demande:', error);
    res.status(500).json({ error: 'Erreur serveur', details: error.message, stack: error.stack });
  }
});

// Route pour récupérer toutes les demandes
app.get('/api/demandes', async (req, res) => {
  try {
    const query = 'SELECT *, DATE_FORMAT(date_demande, "%Y-%m-%d") as dateDemande, DATE_FORMAT(date_action, "%Y-%m-%d") as dateAction FROM demandes ORDER BY date_demande DESC';
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes' });
  }
});

// Route pour récupérer les demandes en attente
app.get('/api/demandes/pending', async (req, res) => {
  try {
    const query = 'SELECT *, DATE_FORMAT(date_demande, "%Y-%m-%d") as dateDemande, DATE_FORMAT(date_action, "%Y-%m-%d") as dateAction FROM demandes WHERE statut = "en attente" ORDER BY date_demande DESC';
    const [rows] = await db.execute(query);
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes en attente:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des demandes en attente' });
  }
});

async function sendMail(to, subject, message) {
  try {
    console.log('=== Détails de l\'envoi d\'email ===');
    console.log('Destinataire:', to);
    console.log('Sujet:', subject);
    
    if (!to || !subject || !message) {
      throw new Error(`Données d'email incomplètes: to=${to}, subject=${subject}, message=${message ? 'présent' : 'absent'}`);
    }

    const payload = {
      to,
      subject,
      html: message,
      contentType: 'text/html'
    };
    
    console.log('Payload email:', JSON.stringify(payload, null, 2));
    
    const response = await axiosLib.post(MAILER_API_URL, payload, {
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      },
      httpsAgent: agent
    });
    
    console.log('Email envoyé avec succès à', to);
    return { success: true, data: response.data };
  } catch (e) {
    console.error('Erreur détaillée lors de l\'envoi du mail:', {
      message: e.message,
      destinataire: to,
      sujet: subject,
      stack: e.stack
    });
    throw e;
  }
}

// Route pour valider une demande
app.put('/api/demandes/:id/validate', async (req, res) => {
  try {
    const id = req.params.id;
    const { commentaire_admin } = req.body;
    console.log('Tentative de validation de la demande:', id);
    
    // Vérifier si la demande existe et afficher son statut actuel
    const [checkResult] = await db.execute('SELECT * FROM demandes WHERE id = ?', [id]);
    console.log('Détails de la demande:', checkResult[0]);
    
    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    const demande = checkResult[0];
    console.log('Email du demandeur:', demande.email);

    // Mettre à jour le statut et le commentaire
    const query = 'UPDATE demandes SET statut = ?, commentaire_admin = ? WHERE id = ?';
    const [result] = await db.execute(query, ['validee', commentaire_admin, id]);
    console.log('Résultat de la mise à jour:', result);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Aucune demande mise à jour' });
    }

    // Envoi des emails de manière séquentielle pour mieux gérer les erreurs
    try {
      // Mail à l'utilisateur
      let msgUser = `<b>Votre demande a été validée.</b><br><b>Intitulé :</b> ${demande.intitule}<br><b>Date :</b> ${demande.date_demande}<br>`;
      if (commentaire_admin) msgUser += `<b>Commentaire de l'administrateur :</b> ${commentaire_admin}<br>`;
      msgUser += `<br>Vous pouvez suivre l'évolution de votre demande sur la plateforme en cliquant sur ce lien : <a href="http://localhost:5173/suivi">Suivre mes demandes</a>`;
      
      console.log('Envoi de l\'email au demandeur...');
      await sendMail(
        demande.email,
        `Votre demande a été validée : ${demande.intitule}`,
        msgUser
      );
      console.log('Email au demandeur envoyé avec succès');

      // Mail à l'admin
      let msgAdmin = `<b>Statut modifié sur une demande</b><br><b>Intitulé :</b> ${demande.intitule}<br><b>Responsable :</b> ${demande.responsable}<br><b>Email demandeur :</b> ${demande.email}<br><b>Nouveau statut :</b> validée<br><b>Date :</b> ${demande.date_demande}<br>`;
      if (commentaire_admin) msgAdmin += `<b>Commentaire admin :</b> ${commentaire_admin}<br>`;
      
      console.log('Envoi de l\'email à l\'admin...');
      await sendMail(
        VALIDATOR_EMAIL,
        `Statut de demande validée : ${demande.intitule}`,
        msgAdmin
      );
      console.log('Email à l\'admin envoyé avec succès');

    } catch (emailError) {
      console.error('Erreur lors de l\'envoi des emails:', emailError);
      // On continue car la validation a réussi, mais on informe du problème d'email
      return res.json({ 
        message: 'Demande validée avec succès mais erreur lors de l\'envoi des emails',
        emailError: emailError.message
      });
    }

    res.json({ message: 'Demande validée avec succès' });
  } catch (error) {
    console.error('Erreur détaillée lors de la validation de la demande:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors de la validation de la demande',
      details: error.message,
      stack: error.stack,
    });
  }
});

// Route pour refuser une demande
app.put('/api/demandes/:id/reject', async (req, res) => {
  try {
    const id = req.params.id;
    const { commentaire_admin } = req.body;
    console.log('Tentative de refus de la demande:', id);
    
    // Vérifier si la demande existe et afficher son statut actuel
    const [checkResult] = await db.execute('SELECT id, statut FROM demandes WHERE id = ?', [id]);
    console.log('Statut actuel de la demande:', checkResult[0]?.statut);
    if (checkResult.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    // Mettre à jour le statut avec la bonne valeur ENUM et le commentaire
    const query = 'UPDATE demandes SET statut = ?, commentaire_admin = ? WHERE id = ?';
    const [result] = await db.execute(query, ['annulee', commentaire_admin, id]);
    console.log('Résultat de la mise à jour:', result);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Aucune demande mise à jour' });
    }

    // Récupérer la demande mise à jour
    const [rows] = await db.execute('SELECT * FROM demandes WHERE id = ?', [id]);
    const demande = rows[0];
    
    if (demande) {
      // Envoi des emails de manière non-bloquante
      Promise.all([
        // Mail à l'utilisateur
        (async () => {
          let msg = `<b>Votre demande a été refusée/annulée.</b><br><b>Intitulé :</b> ${demande.intitule}<br><b>Date :</b> ${demande.date_demande}<br>`;
          if (demande.commentaire_admin) msg += `<b>Commentaire de l'administrateur :</b> ${demande.commentaire_admin}<br>`;
          msg += `<br>Pour toute question, contactez l'administration.`;
          await sendMail(
            demande.email,
            `Votre demande a été refusée/annulée : ${demande.intitule}`,
            msg
          );
        })(),
        // Mail à l'admin
        (async () => {
          let msgAdmin = `<b>Statut modifié sur une demande</b><br><b>Intitulé :</b> ${demande.intitule}<br><b>Responsable :</b> ${demande.responsable}<br><b>Nouveau statut :</b> annulée<br><b>Date :</b> ${demande.date_demande}<br>`;
          if (demande.commentaire_admin) msgAdmin += `<b>Commentaire admin :</b> ${demande.commentaire_admin}<br>`;
          await sendMail(
            VALIDATOR_EMAIL,
            `Statut de demande refusée/annulée : ${demande.intitule}`,
            msgAdmin
          );
        })()
      ]).catch(error => {
        console.error('Erreur lors de l\'envoi des emails (non bloquante):', error);
      });
    }

    res.json({ message: 'Demande refusée avec succès' });
  } catch (error) {
    console.error('Erreur détaillée lors du refus de la demande:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors du refus de la demande',
      details: error.message,
      stack: error.stack
    });
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,  // Accepte toutes les origines
    methods: ['GET', 'POST'],
    credentials: false  // Désactive credentials
  }
});

// Middleware pour la gestion des erreurs Socket.IO
io.use((socket, next) => {
  try {
    // Vous pouvez ajouter ici une logique d'authentification si nécessaire
    next();
  } catch (error) {
    next(new Error('Erreur d\'authentification Socket.IO'));
  }
});

io.on('connection', (socket) => {
  console.log('Client connecté via WebSocket');

  socket.on('error', (error) => {
    console.error('Erreur Socket.IO:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log('Client déconnecté:', reason);
  });

  socket.on('send-mail', async (data, callback) => {
    try {
      console.log('=== WebSocket: Détails de l\'envoi d\'email ===');
      console.log('Données reçues:', JSON.stringify(data, null, 2));
      
      if (!data.to || !data.subject || !data.message) {
        throw new Error('Données d\'email incomplètes');
      }

      const response = await axiosLib.post('https://svrapi.agglo.local/mailer', {
        to: data.to,
        subject: data.subject,
        html: data.message,
        contentType: data.contentType || 'text/html'
      }, {
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json'
        },
        httpsAgent: agent
      });
      
      console.log('Réponse de l\'API mailer (WebSocket):', response.data);
      callback({ success: true, data: response.data });
    } catch (e) {
      console.error('Erreur détaillée lors de l\'envoi du mail (WebSocket):', {
        message: e.message,
        response: e.response?.data,
        status: e.response?.status,
        headers: e.response?.headers
      });
      callback({ 
        success: false, 
        error: e.message,
        details: e.response?.data || 'Erreur inconnue'
      });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
