import { useNavigate } from 'react-router-dom'
import './ProfilePicker.css'

const PROFILES = [
  {
    key: 'intern',
    label: 'Stage',
    description: 'Demi-journée · Sensibilisation IA',
  },
  {
    key: 'observer',
    label: 'Observation',
    description: '3 jours · Théorie + exercices guidés',
  },
  {
    key: 'apprentice',
    label: 'CFC',
    description: 'Parcours complet · Tous les ateliers',
  },
] as const

type ProfileKey = (typeof PROFILES)[number]['key']

export default function ProfilePicker() {
  const navigate = useNavigate()

  function selectProfile(key: ProfileKey) {
    localStorage.setItem('profile', key)
    navigate('/workshops')
  }

  return (
    <main className="profile-picker">
      <h1>Choisissez votre profil</h1>
      <p className="subtitle">Votre sélection détermine les ateliers accessibles.</p>
      <div className="profile-cards">
        {PROFILES.map(({ key, label, description }) => (
          <button
            key={key}
            data-testid={`profile-card-${key}`}
            className="profile-card"
            onClick={() => selectProfile(key)}
          >
            <span className="profile-label">{label}</span>
            <span className="profile-description">{description}</span>
          </button>
        ))}
      </div>
    </main>
  )
}
