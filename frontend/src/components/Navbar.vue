<template>
  <nav class="navbar-glass">
    <div class="navbar-content">
      <router-link to="/" class="navbar-logo">
        <i class="bi bi-house-door"></i>
        <span class="navbar-title">ACV</span>
      </router-link>
      <span class="navbar-separator"></span>
      <div class="navbar-links" :class="{ open: menuOpen }">
        <router-link to="/demande" class="navbar-link" active-class="active">Faire une demande</router-link>
        <router-link to="/suivi" class="navbar-link" active-class="active">Suivi</router-link>
      </div>
      <button class="navbar-burger" @click="menuOpen = !menuOpen">
        <i class="bi" :class="menuOpen ? 'bi-x-lg' : 'bi-list'" />
      </button>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue';
const menuOpen = ref(false);
</script>

<style scoped>
.navbar {
  background: var(--gradient-primary);
}

.navbar-glass:hover {
  background: var(--gradient-primary);
}

.mobile-menu {
  background: var(--gradient-primary);
}

.navbar-glass {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: var(--gradient-primary);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 30px rgb(255, 255, 255);
  border-bottom: 1px solid rgb(255, 255, 255);
  padding: 0.8rem 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top;
  animation: navbarSlideDown 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes navbarSlideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.navbar-glass:hover {
  box-shadow: 0 12px 50px rgba(11, 95, 176, 0.3);
  transform: translateY(2px);
}

.navbar-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  position: relative;
}

.navbar-content::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ffffff, transparent);
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  transform: translateX(-50%);
}

.navbar-glass:hover .navbar-content::after {
  width: 80%;
}

.navbar-logo {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-size: 1.5rem;
  color: #FFFFFF;
  font-weight: bold;
  text-decoration: none;
  letter-spacing: 1.5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  position: relative;
  overflow: hidden;
}

.navbar-logo::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(170, 241, 255, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.5);
}

.navbar-logo:hover {
  color: #FFFFFF;
  transform: translateY(-2px) scale(1.02);
  text-shadow: 0 0 15px rgba(170, 241, 255, 0.5);
}

.navbar-logo:hover::before {
  opacity: 1;
  transform: scale(1.5);
}

.navbar-logo i {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.navbar-logo:hover i {
  transform: scale(1.2) rotate(-10deg);
  color: #2BA3EC;
  filter: drop-shadow(0 0 8px rgba(43, 163, 236, 0.5));
}

.navbar-title {
  font-size: 1.3rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #FFFFFF;
  text-shadow: 0 2px 8px rgba(170, 241, 255, 0.2);
  position: relative;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.navbar-logo:hover .navbar-title {
  transform: scale(1.1);
  background-position: right center;
}

.navbar-separator {
  width: 1px;
  height: 24px;
  background: linear-gradient(180deg, rgba(170, 241, 255, 0.3) 0%, rgba(170, 241, 255, 0.1) 50%, rgba(170, 241, 255, 0.3) 100%);
  margin: 0 1.5rem;
  border-radius: 1px;
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
  position: relative;
  overflow: hidden;
}

.navbar-separator::after {
  content: '';
  position: absolute;
  top: -100%;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgb(255, 255, 255) 0%, transparent 100%);
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.navbar-glass:hover .navbar-separator {
  transform: scaleY(1.3);
}

.navbar-glass:hover .navbar-separator::after {
  top: 0;
}

.navbar-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.navbar-link {
  color: #FFFFFF;
  font-weight: 500;
  text-decoration: none;
  padding: 0.6em 1.2em;
  border-radius: 12px;
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 1.05rem;
  overflow: hidden;
}

.navbar-link::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 12px;
  padding: 2px;
  background: linear-gradient(135deg, #0B5FBO 0%, #2BA3EC 100%);
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.8) rotate(-5deg);
}

.navbar-link::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(170, 241, 255, 0.15) 0%, transparent 70%);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.5);
}

.navbar-link:hover {
  color: #FFFFFF;
  transform: translateY(-2px);
  text-shadow: 0 0 15px rgba(170, 241, 255, 0.5);
}

.navbar-link:hover::before {
  opacity: 1;
  transform: scale(1) rotate(0deg);
}

.navbar-link:hover::after {
  opacity: 1;
  transform: scale(1.5);
}

.navbar-link.active {
  color: #FFFFFF;
  background: rgba(170, 241, 255, 0.15);
  transform: translateY(-1px);
  text-shadow: 0 0 10px rgba(170, 241, 255, 0.3);
  box-shadow: 0 4px 15px rgba(170, 241, 255, 0.1);
}

.navbar-burger {
  display: none;
  background: none;
  border: none;
  font-size: 1.8rem;
  color: #FFFFFF;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 12px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.navbar-burger::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(170, 241, 255, 0.2) 0%, transparent 70%);
  opacity: 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform: scale(0.5);
}

.navbar-burger:hover {
  transform: translateY(-2px) scale(1.1);
  color: #FFFFFF;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
}

.navbar-burger:hover::before {
  opacity: 1;
  transform: scale(1.5);
}

.navbar-burger:active {
  transform: scale(0.95) rotate(180deg);
}

.navbar-burger i {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: center;
}

.navbar-burger:hover i {
  transform: scale(1.2) rotate(10deg);
  color: #2BA3EC;
  filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
}

@media (max-width: 768px) {
  .navbar-links {
    position: fixed;
    top: 100%;
    right: 1rem;
    background: var(--gradient-primary);
    backdrop-filter: blur(12px);
    box-shadow: 0 12px 50px rgba(11, 95, 176, 0.3);
    border-radius: 16px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    transform: translateY(-10px) scale(0.95);
    opacity: 0;
    pointer-events: none;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .navbar-links.open {
    display: flex;
    animation: menuSlide 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .navbar-burger {
    display: block;
  }
  
  .navbar-link {
    width: 100%;
    text-align: center;
    padding: 0.8em 1.2em;
  }
}

@keyframes menuSlide {
  0% {
    opacity: 0;
    transform: scale(0.95) translateY(-10px) rotate(-2deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0) rotate(0deg);
  }
}
</style> 