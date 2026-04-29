import { useState } from 'react'
import { MobileShell } from '@app/MobileShell'
import { PrimaryButton, SecondaryButton } from '@shared/components/primitives'
import { TextField, SelectField } from '@shared/components/TextField'
import { HorionMark, HorionWordmark } from '@shared/icons/HorionMark'
import { completeOnboarding, updateSettings } from '@/data/repositories/settings'
import { useIsDesktop } from '@shared/hooks/useMediaQuery'
import type { CurrencyCode } from '@/data/types'

const ALL_CURRENCIES: CurrencyCode[] = ['COP', 'EUR', 'USD', 'PLN']

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [defaultCurrency, setDefaultCurrency] = useState<CurrencyCode>('COP')
  const [enabled, setEnabled] = useState<CurrencyCode[]>(['COP', 'EUR', 'USD', 'PLN'])

  const finalize = async () => {
    await updateSettings({
      userName: name.trim(),
      userCity: city.trim(),
      defaultCurrency,
      enabledCurrencies: enabled.length > 0 ? enabled : [defaultCurrency],
    })
    await completeOnboarding()
    onDone()
  }

  const isDesktop = useIsDesktop()

  const content = (
    <div
      style={{
        minHeight: isDesktop ? 'auto' : '100dvh',
        display: 'flex',
        flexDirection: 'column',
        padding: isDesktop ? '0' : '40px 24px calc(40px + env(safe-area-inset-bottom))',
        maxWidth: isDesktop ? 520 : undefined,
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <HorionMark size={36} color="var(--accent)" />
        <HorionWordmark size={20} color="var(--ink)" tagline />
      </div>

      {step === 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--accent)',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Paso 1 de 3
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 36,
                color: 'var(--ink)',
                lineHeight: 1.05,
                letterSpacing: -1,
                marginTop: 12,
              }}
            >
              Bienvenida a tu cuartel de mando.
            </div>
            <div
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 14,
                color: 'var(--ink-mute)',
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              Horión organiza tus finanzas, tus tours, tu material, tu portafolio y tu bienestar. Funciona offline — registra
              cuando quieras y donde quieras.
            </div>
          </div>
          <div style={{ marginTop: 32 }}>
            <PrimaryButton onClick={() => setStep(1)}>Empezar</PrimaryButton>
          </div>
        </div>
      )}

      {step === 1 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--accent)',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Paso 2 de 3
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 32,
                color: 'var(--ink)',
                lineHeight: 1.05,
                letterSpacing: -0.8,
                marginTop: 12,
                marginBottom: 24,
              }}
            >
              ¿Cómo te llamas y dónde estás?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TextField label="Nombre" value={name} onChange={setName} placeholder="Ej: Dayana" />
              <TextField label="Ciudad actual" value={city} onChange={setCity} placeholder="Ej: Berlín" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 32 }}>
            <SecondaryButton onClick={() => setStep(0)} style={{ flex: 1 }}>
              Atrás
            </SecondaryButton>
            <div style={{ flex: 2 }}>
              <PrimaryButton onClick={() => setStep(2)} disabled={!name.trim()}>
                Continuar
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--accent)',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              Paso 3 de 3
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: 32,
                color: 'var(--ink)',
                lineHeight: 1.05,
                letterSpacing: -0.8,
                marginTop: 12,
                marginBottom: 24,
              }}
            >
              ¿Qué monedas usas?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SelectField
                label="Moneda principal"
                value={defaultCurrency}
                onChange={(v) => {
                  const c = v as CurrencyCode
                  setDefaultCurrency(c)
                  if (!enabled.includes(c)) setEnabled([...enabled, c])
                }}
                options={ALL_CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--ink-mute)',
                    letterSpacing: 1.2,
                    textTransform: 'uppercase',
                    marginBottom: 8,
                  }}
                >
                  Otras que también usas
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ALL_CURRENCIES.map((c) => {
                    const active = enabled.includes(c)
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setEnabled((prev) => (active ? prev.filter((x) => x !== c) : [...prev, c]))
                        }
                        style={{
                          padding: '8px 14px',
                          borderRadius: 99,
                          background: active ? 'var(--ink)' : 'transparent',
                          color: active ? 'var(--bg)' : 'var(--ink-mute)',
                          border: active ? 'none' : '0.5px solid var(--hairline)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 12,
                          letterSpacing: 0.6,
                        }}
                      >
                        {c}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 32 }}>
            <SecondaryButton onClick={() => setStep(1)} style={{ flex: 1 }}>
              Atrás
            </SecondaryButton>
            <div style={{ flex: 2 }}>
              <PrimaryButton onClick={finalize}>Entrar a Horión</PrimaryButton>
            </div>
          </div>
        </div>
      )}
      </div>
  )

  if (isDesktop) {
    return (
      <div style={{
        minHeight: '100dvh', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 32,
          border: '0.5px solid var(--hairline)',
          padding: '48px 52px', width: '100%', maxWidth: 520,
          boxShadow: '0 24px 60px -12px rgba(10,2,4,0.18)',
        }}>
          {content}
        </div>
      </div>
    )
  }

  return (
    <MobileShell showOfflineBanner={false}>
      {content}
    </MobileShell>
  )
}
