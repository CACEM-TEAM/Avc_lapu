import { defineStore } from 'pinia'

export const useFormStore = defineStore('form', {
  state: () => ({
    demandes: [],
  }),
  actions: {
    async submitForm(payload) {
      try {
        // 👉 Appel à l'API FeathersJS (exemple)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/demandes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })

        const data = await response.json()
        this.demandes.push(data)
        console.log('✅ Formulaire soumis', data)
      } catch (error) {
        console.error('❌ Erreur soumission :', error)
      }
    }
  }
})
