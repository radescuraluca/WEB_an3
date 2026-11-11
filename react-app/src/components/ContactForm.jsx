import { useRef, useState } from 'react'

// Regulile de validare: fiecare întoarce mesajul de eroare sau "" dacă e corect
const rules = {
  name(value) {
    if (!value) return 'Numele este obligatoriu.'
    if (value.length < 3) return 'Numele trebuie să aibă cel puțin 3 caractere.'
    if (!/^[\p{L}\s\-']+$/u.test(value)) return 'Numele poate conține doar litere, spații și cratimă.'
    return ''
  },
  email(value) {
    if (!value) return 'Emailul este obligatoriu.'
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) return 'Adresa de email nu este validă (ex: nume@exemplu.ro).'
    return ''
  },
  phone(value) {
    if (!value) return '' // opțional
    if (!/^(\+40|0)7\d{8}$/.test(value.replace(/[\s.-]/g, ''))) return 'Număr invalid. Exemplu: 0712 345 678.'
    return ''
  },
  subject(value) {
    return value ? '' : 'Alege un subiect.'
  },
  message(value) {
    if (!value) return 'Mesajul este obligatoriu.'
    if (value.length < 20) return `Mai scrie cel puțin ${20 - value.length} caractere.`
    return ''
  },
  consent(value) {
    return value ? '' : 'Trebuie să bifezi acordul.'
  },
}

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', consent: false }

const clean = (value) => (typeof value === 'string' ? value.trim() : value)

function ContactForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  // Câmpurile verificate deja (după asta, validarea se face în timp real)
  const [checked, setChecked] = useState({})
  const [success, setSuccess] = useState('')
  const formRef = useRef(null)

  function validate(name, value) {
    const message = rules[name](clean(value))
    setErrors((prev) => ({ ...prev, [name]: message }))
    setChecked((prev) => ({ ...prev, [name]: true }))
    return message === ''
  }

  function handleChange(event) {
    const { name, type, value, checked: isChecked, tagName } = event.target
    const newValue = type === 'checkbox' ? isChecked : value
    setValues((prev) => ({ ...prev, [name]: newValue }))

    if (checked[name] || type === 'checkbox' || tagName === 'SELECT') validate(name, newValue)
  }

  // La părăsirea câmpului verificăm doar dacă s-a scris ceva
  function handleBlur(event) {
    const { name } = event.target
    const value = values[name]
    if ((typeof value === 'string' && value.trim() !== '') || errors[name]) validate(name, value)
  }

  function fieldClass(name) {
    if (!checked[name]) return ''
    if (errors[name]) return 'invalid'
    return typeof values[name] === 'string' && values[name].trim() !== '' ? 'valid' : ''
  }

  // Proprietățile comune tuturor câmpurilor
  function fieldProps(name) {
    return {
      id: name,
      name,
      value: values[name],
      onChange: handleChange,
      onBlur: handleBlur,
      className: fieldClass(name),
      'aria-invalid': Boolean(errors[name]),
      'aria-describedby': `${name}-error`,
    }
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSuccess('')

    const results = Object.keys(rules).map((name) => [name, validate(name, values[name])])
    const firstInvalid = results.find(([, ok]) => !ok)
    if (firstInvalid) {
      formRef.current.elements[firstInvalid[0]].focus()
      return
    }

    // Nu avem server, așa că doar confirmăm primirea
    setSuccess(`✓ Mulțumim, ${values.name.trim()}! Mesajul tău a fost trimis.`)
    setValues(EMPTY)
    setErrors({})
    setChecked({})
  }

  return (
    <section id="contact" className="card contact" aria-labelledby="contact-title">
      <div className="contact-intro">
        <h2 id="contact-title" className="card-title">✉️ Trimite-ne o sugestie</h2>
        <p className="muted">
          Ai găsit o problemă sau ai o idee? Completează formularul. Câmpurile marcate cu * sunt obligatorii.
        </p>
      </div>

      <form ref={formRef} className="contact-form" noValidate onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Nume *</label>
          <input type="text" maxLength={60} autoComplete="name" placeholder="Ion Popescu" {...fieldProps('name')} />
          <p className="field-error" id="name-error" aria-live="polite">{errors.name}</p>
        </div>

        <div className="field">
          <label htmlFor="email">Email *</label>
          <input type="email" autoComplete="email" placeholder="nume@exemplu.ro" {...fieldProps('email')} />
          <p className="field-error" id="email-error" aria-live="polite">{errors.email}</p>
        </div>

        <div className="field">
          <label htmlFor="phone">Telefon <span className="muted">(opțional)</span></label>
          <input type="tel" autoComplete="tel" placeholder="0712 345 678" {...fieldProps('phone')} />
          <p className="field-error" id="phone-error" aria-live="polite">{errors.phone}</p>
        </div>

        <div className="field">
          <label htmlFor="subject">Subiect *</label>
          <select {...fieldProps('subject')}>
            <option value="">Alege un subiect</option>
            <option value="sugestie">Sugestie</option>
            <option value="eroare">Raportează o eroare</option>
            <option value="altceva">Altceva</option>
          </select>
          <p className="field-error" id="subject-error" aria-live="polite">{errors.subject}</p>
        </div>

        <div className="field field-full">
          <label htmlFor="message">
            Mesaj * <span className="counter">{values.message.length} / 500</span>
          </label>
          <textarea rows={5} maxLength={500} placeholder="Scrie cel puțin 20 de caractere..." {...fieldProps('message')} />
          <p className="field-error" id="message-error" aria-live="polite">{errors.message}</p>
        </div>

        <div className="field field-full">
          <label className="checkbox">
            <input
              type="checkbox"
              id="consent"
              name="consent"
              checked={values.consent}
              onChange={handleChange}
              className={errors.consent ? 'invalid' : ''}
              aria-invalid={Boolean(errors.consent)}
              aria-describedby="consent-error"
            />
            <span>Sunt de acord ca datele mele să fie folosite pentru a primi un răspuns. *</span>
          </label>
          <p className="field-error" id="consent-error" aria-live="polite">{errors.consent}</p>
        </div>

        <div className="field-full">
          <button type="submit" className="btn-primary">Trimite mesajul</button>
        </div>
      </form>

      {success && <p className="success" role="status">{success}</p>}
    </section>
  )
}

export default ContactForm
