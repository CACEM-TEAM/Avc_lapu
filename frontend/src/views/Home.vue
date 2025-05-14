<template>
  <div class="home-bg">
    <div class="home-container">
      <div class="home-header">
        <div class="home-title-row">
          <span class="home-logo"><i class="bi bi-people-fill"></i></span>
          <h1 class="home-title animated-fadein">
            <span class="welcome">Bienvenue</span>
            <span class="on">sur le portail de </span>
            <span class="on">demande d'intervention </span>
          </h1>
        </div>
        <div class="home-tagline animated-fadein-delay">
          <span class="glass-tag">Ambassadeurs du Cadre de Vie</span>
        </div>
        <p class="home-subtitle animated-fadein-delay2">
          Gérez vos demandes d'intervention facilement et suivez leur progression en temps réel.
        </p>
        <div class="header-separator"></div>
      </div>
      <div class="home-cards">
        <div class="home-card-wrapper">
          <router-link to="/demande" class="home-link">
            <div class="glass-card">
              <div class="card-body text-center">
                <div class="card-icon-circle">
                  <img src="/liste-de-controle.png" alt="Liste de contrôle" class="card-icon" />
                </div>
                <h5 class="card-title">Faire une demande</h5>
                <p class="card-text">
                  Besoin d'une intervention ?<br />
                  Déposez votre demande en quelques clics.
                </p>
                <button class="btn-glass">Créer une demande</button>
              </div>
            </div>
          </router-link>
        </div>
        <div class="home-card-wrapper">
          <router-link to="/suivi" class="home-link">
            <div class="glass-card dark">
              <div class="card-body text-center">
                <div class="card-icon-circle dark">
                  <img src="/suivre.png" alt="Suivre" class="card-icon" />
                </div>
                <h5 class="card-title">Suivre mes demandes</h5>
                <p class="card-text">
                  Consultez l'état de vos demandes et recevez des mises à jour instantanées.
                </p>
                <button class="btn-glass btn-glass-outline">Voir mes demandes</button>
              </div>
            </div>
          </router-link>
        </div>
      </div>
    </div>
    <router-view />
  </div>
</template>

<style scoped>
@keyframes fadein {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: none; }
}
.animated-fadein {
  animation: fadein 0.8s cubic-bezier(.4,0,.2,1) 0.1s both;
}
.animated-fadein-delay {
  animation: fadein 0.8s cubic-bezier(.4,0,.2,1) 0.4s both;
}
.animated-fadein-delay2 {
  animation: fadein 0.8s cubic-bezier(.4,0,.2,1) 0.7s both;
}
.home-bg {
  min-height: 100vh;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 4rem 1.5rem;
  overflow: hidden;
}

.home-bg::before {
  content: '';
  position: absolute;
  width: 200%;
  height: 200%;
  top: -50%;
  left: -50%;
  background: 
    radial-gradient(circle at 50% 50%, 
      rgba(255, 255, 255, 0.956) 0%,
      transparent 25%),
    radial-gradient(circle at 0% 0%, 
      rgb(255, 255, 255) 0%,
      transparent 25%),
    radial-gradient(circle at 100% 100%, 
      rgba(0, 165, 171, 0.08) 0%,
      transparent 25%);
  animation: morph 25s ease-in-out infinite alternate;
  z-index: 0;
}

.home-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: 
    linear-gradient(125deg, 
      rgba(255, 255, 255, 0.389) 0%,
      rgba(255, 255, 255, 0) 40%),
    linear-gradient(45deg, 
      rgba(255, 255, 255, 0.3) 0%,
      rgba(255, 255, 255, 0) 40%);
  backdrop-filter: blur(100px);
  z-index: 0;
  animation: shine 8s ease-in-out infinite;
}

@keyframes morph {
  0% {
    transform: scale(1) rotate(0deg);
  }
  33% {
    transform: scale(1.1) rotate(1deg);
  }
  66% {
    transform: scale(0.9) rotate(-1deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}

@keyframes shine {
  0%, 100% {
    opacity: 0.5;
    transform: translateX(-100%) translateY(-100%);
  }
  50% {
    opacity: 0.8;
    transform: translateX(100%) translateY(100%);
  }
}

.home-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  backdrop-filter: blur(10px);
}

.home-header {
  margin-bottom: 3rem;
  text-align: center;
}

.home-title-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.1rem;
  margin-top: 10%;
}

.home-logo {
  font-size: 2.2rem;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(15, 33, 77, 0.164);
  padding: 0.25em 0.45em 0.18em 0.45em;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-title {
  font-size: 3rem;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: #1a1a1a;
  margin-bottom: 0.3em;
  line-height: 1.2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25em;
  text-align: center;
  text-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.welcome {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 900;
  font-size: 1.3em;
  letter-spacing: 2.5px;
  text-shadow: 0 2px 8px rgba(15,33,77,0.12);
  margin-bottom: 0.15em;
}

.on {
  color: #0f214d;
  font-weight: 600;
  font-size: 1.05em;
  margin: 0;
  line-height: 1.3;
}

.home-tagline {
  margin: 0.5em 0 1.2em 0;
  display: flex;
  justify-content: center;
}

.glass-tag {
  background: rgba(255,255,255,0.55);
  backdrop-filter: blur(8px);
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 800;
  font-size: 1.25em;
  border-radius: 18px;
  padding: 0.25em 1.2em;
  box-shadow: 0 2px 12px rgba(0,165,171,0.07);
  letter-spacing: 1.5px;
  display: inline-block;
}

.home-subtitle {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: 1.15rem;
  margin-top: 0.7em;
  text-shadow: 1px 1px 4px rgba(0,0,0,0.07);
}

.header-separator {
  width: 100%;
  max-width: 420px;
  height: 3px;
  margin: 1.5em auto 0.5em auto;
  background: linear-gradient(90deg, rgba(15,33,77,0.13) 0%, rgba(15,33,77,0.35) 50%, rgba(15,33,77,0.13) 100%);
  border-radius: 2px;
  opacity: 0.7;
}

.home-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 2.5rem;
  justify-content: center;
  width: 100%;
}

.home-card-wrapper {
  flex: 1 1 340px;
  max-width: 400px;
  display: flex;
  justify-content: center;
}

.home-link {
  text-decoration: none;
  width: 100%;
  display: block;
}

.glass-card {
  position: relative;
  z-index: 2;
  width: 100%;
  border-radius: 28px;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(12px);
  box-shadow: 
    0 8px 32px 0 rgba(31, 38, 135, 0.15),
    0 2px 8px 0 rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255,255,255,0.25);
  color: #1a1a1a;
  padding: 2.5rem 2rem 2rem 2rem;
  min-height: 380px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  background-clip: padding-box;
}

.glass-card:hover {
  transform: translateY(-12px) scale(1.02);
  box-shadow: 
    0 20px 40px 0 rgba(31, 38, 135, 0.2),
    0 4px 12px 0 rgba(0, 0, 0, 0.08);
  background: rgba(255,255,255,0.85);
}

.glass-card.dark {
  background: #0f214d;
  color: #ffffff;
}

.glass-card.dark:hover {
  background: #0f214d;
  color: #ffffff;
}

.card-icon-circle {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffffff00 0%, #ffffff00 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem auto;
  font-size: 2.2rem;
  color: #fff;
  box-shadow: 
    0 4px 12px rgba(0,165,171,0.2),
    0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.4s ease;
}

.card-icon-circle:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 
    0 6px 16px rgba(0,165,171,0.25),
    0 3px 6px rgba(0,0,0,0.12);
}

.card-icon-circle.dark {
  background: linear-gradient(135deg, #ffffff 60%, #ffffff 100%);
}

.card-title {
  color: inherit;
  margin-bottom: 1rem;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.card-text {
  color: inherit;
  opacity: 0.92;
  font-size: 1.05rem;
  margin-bottom: 1.2rem;
}

.btn-glass {
  background: linear-gradient(135deg, #0f214d 0%, #162d68 100%);
  color: #fff;
  font-weight: 600;
  border-radius: 50px;
  padding: 14px 42px;
  border: none;
  font-size: 1.15rem;
  box-shadow: 
    0 4px 12px rgba(15,33,77,0.2),
    0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  letter-spacing: 0.5px;
  position: relative;
  overflow: hidden;
}

.btn-glass::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn-glass:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 
    0 8px 20px rgba(15,33,77,0.25),
    0 4px 8px rgba(0,0,0,0.15);
}

.btn-glass:hover::after {
  opacity: 1;
}

.btn-glass-outline {
  background: transparent;
  color: #ffffff;
  border: 2px solid #ffffff;
}

.btn-glass-outline:hover {
  background: #0f214d;
  color: #fff;
  border: 2px solid #0f214d;
}

.card-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
}

@media (max-width: 900px) {
  .home-cards {
    flex-direction: column;
    gap: 2rem;
    align-items: center;
  }
  .home-card-wrapper {
    max-width: 100%;
  }
}

@media (max-width: 600px) {
  .home-header {
    margin-bottom: 2rem;
  }
  .home-title {
    font-size: 1.3rem;
  }
  .glass-card {
    padding: 1.2rem 0.7rem 1rem 0.7rem;
    min-height: 220px;
  }
  .card-icon-circle {
    width: 40px;
    height: 40px;
    font-size: 1.3rem;
  }
  .glass-tag {
    font-size: 1em;
    padding: 0.18em 0.7em;
  }
  .home-logo {
    font-size: 1.3rem;
    padding: 0.18em 0.3em 0.12em 0.3em;
  }
  .header-separator {
    max-width: 180px;
    height: 2px;
  }
}
</style>
