import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import NumberField from './NumberField';
import Alert from './Alert';
import styles from './ScoringConfigForm.module.css';

const GROUPS = [
  { key: 'AF', name: 'Adaptive friction' },
  { key: 'FF', name: 'Fund flow' },
  { key: 'PH', name: 'Phishing site' },
];

function describeSignal(key) {
  const [code, ...rest] = key.split('_');
  const name = rest.join('_');

  const label = name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();

  return {
    code,
    label: label || code,
  };
}

const num = (v) =>
  v === '' || v === null || v === undefined
    ? NaN
    : Number(v);

function toFormState(config) {
  return {
    groupWeights: Object.fromEntries(
      GROUPS.map((g) => [
        g.key,
        String(config.groupWeights?.[g.key] ?? ''),
      ])
    ),

    signalWeights: Object.fromEntries(
      GROUPS.map((g) => [
        g.key,
        Object.fromEntries(
          Object.entries(
            config.signalWeights?.[g.key] || {}
          ).map(([k, v]) => [k, String(v)])
        ),
      ])
    ),

    bands: (config.bands || []).map((b) => ({
      key: b.key,
      min: String(b.min),
      max: String(b.max),
      generatesSTR: Boolean(b.generatesSTR),
    })),
  };
}

function toConfigPayload(baseConfig, form) {
  return {
    ...baseConfig,

    bands: baseConfig.bands.map((band) => {
      const edited = form.bands.find(
        (b) => b.key === band.key
      );

      return edited
        ? {
            ...band,
            min: num(edited.min),
            max: num(edited.max),
            generatesSTR: edited.generatesSTR,
          }
        : band;
    }),

    groupWeights: Object.fromEntries(
      GROUPS.map((g) => [
        g.key,
        num(form.groupWeights[g.key]),
      ])
    ),

    signalWeights: Object.fromEntries(
      GROUPS.map((g) => [
        g.key,
        Object.fromEntries(
          Object.entries(
            form.signalWeights[g.key] || {}
          ).map(([k, v]) => [k, num(v)])
        ),
      ])
    ),
  };
}

function validate(form) {
  const problems = [];

  const groupTotal = GROUPS.reduce(
    (sum, g) =>
      sum + (num(form.groupWeights[g.key]) || 0),
    0
  );

  const groupTotalOk =
    Math.abs(groupTotal - 1) < 0.0001;

  if (!groupTotalOk) {
    problems.push(
      `Signal-group weights add up to ${groupTotal.toFixed(
        4
      )}. They must total exactly 1.0.`
    );
  }

  GROUPS.forEach((g) => {
    const groupValue = num(
      form.groupWeights[g.key]
    );

    if (Number.isNaN(groupValue)) {
      problems.push(
        `${g.name} group weight is empty.`
      );
    } else if (groupValue < 0) {
      problems.push(
        `${g.name} group weight is negative.`
      );
    }

    Object.entries(
      form.signalWeights[g.key] || {}
    ).forEach(([key, value]) => {
      const { code } = describeSignal(key);
      const numericValue = num(value);

      if (Number.isNaN(numericValue)) {
        problems.push(
          `${code} weight is empty.`
        );
      } else if (numericValue < 0) {
        problems.push(
          `${code} weight is negative. Risk-factor weights cannot be below zero.`
        );
      }
    });
  });

  form.bands.forEach((band) => {
    const min = num(band.min);
    const max = num(band.max);

    const name = band.key
      .replace('_', ' ')
      .toLowerCase();

    if (
      Number.isNaN(min) ||
      Number.isNaN(max)
    ) {
      problems.push(
        `The ${name} band has an empty boundary.`
      );
    } else if (min >= max) {
      problems.push(
        `The ${name} band starts at ${min} and ends at ${max}. Its lower bound must be below its upper bound.`
      );
    }
  });

  const ordered = [...form.bands]
    .filter(
      (b) => !Number.isNaN(num(b.min))
    )
    .sort(
      (a, b) =>
        num(a.min) - num(b.min)
    );

  for (let i = 1; i < ordered.length; i += 1) {
    if (
      num(ordered[i].min) <=
      num(ordered[i - 1].max)
    ) {
      problems.push(
        `The ${ordered[i - 1].key
          .replace('_', ' ')
          .toLowerCase()} and ${ordered[i].key
          .replace('_', ' ')
          .toLowerCase()} bands overlap.`
      );
    }
  }

  return {
    problems,
    groupTotal,
    groupTotalOk,
  };
}

/* --------------------------------------------------
   ICONS
-------------------------------------------------- */

function ScaleIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 4v16" />
      <path d="M6 7h12" />
      <path d="M6 7 3 13h6L6 7Z" />
      <path d="M18 7l-3 6h6l-3-6Z" />
      <path d="M8 20h8" />
    </svg>
  );
}

function FingerprintIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 11a3 3 0 0 1 3 3c0 3-.6 5.3-1.8 7" />
      <path d="M9 21c1.2-2.2 1.7-4.6 1.7-7a1.3 1.3 0 1 1 2.6 0" />
      <path d="M7 19c1-2 1.5-4.2 1.5-6.5a3.5 3.5 0 0 1 7 0" />
      <path d="M5.5 17.5c.8-1.8 1.2-3.5 1.2-5.5a5.3 5.3 0 0 1 10.6 0" />
      <path d="M4 14c-.2-1-.3-1.9-.3-2.8a8.3 8.3 0 0 1 16.6 0" />
    </svg>
  );
}

function FlowIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="7" r="2" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="17" r="2" />
      <path d="M8 7l8-1M7 8l0 8M9 18l7-1M17 9l1 6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M12 3 20 6v5.5c0 4.6-3 7.8-8 9.5-5-1.7-8-4.9-8-9.5V6l8-3Z" />
      <path d="m8.5 12 2.2 2.2 4.8-5" />
    </svg>
  );
}

function ThresholdIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 19V9" />
      <path d="M10 19V5" />
      <path d="M15 19v-7" />
      <path d="M20 19V8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

/* --------------------------------------------------
   MAIN COMPONENT
-------------------------------------------------- */

export default function ScoringConfigForm() {
  const [baseConfig, setBaseConfig] =
    useState(null);

  const [form, setForm] =
    useState(null);

  const [status, setStatus] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const load = useCallback(async () => {
    const config =
      await api.getScoringConfig();

    setBaseConfig(config);
    setForm(toFormState(config));
  }, []);

  useEffect(() => {
    load().catch((err) =>
      setStatus({
        tone: 'error',
        text: err.message,
      })
    );
  }, [load]);

  const validation = useMemo(
    () =>
      form
        ? validate(form)
        : null,
    [form]
  );

  if (!form || !baseConfig) {
    return (
      <p className={styles.loading}>
        Loading the active configuration…
      </p>
    );
  }

  const setGroupWeight = (
    key,
    value
  ) => {
    setForm((f) => ({
      ...f,
      groupWeights: {
        ...f.groupWeights,
        [key]: value,
      },
    }));
  };

  const setSignalWeight = (
    group,
    key,
    value
  ) => {
    setForm((f) => ({
      ...f,
      signalWeights: {
        ...f.signalWeights,
        [group]: {
          ...f.signalWeights[group],
          [key]: value,
        },
      },
    }));
  };

  const setBandBound = (
    bandKey,
    bound,
    value
  ) => {
    setForm((f) => ({
      ...f,
      bands: f.bands.map((b) =>
        b.key === bandKey
          ? {
              ...b,
              [bound]: value,
            }
          : b
      ),
    }));
  };

  const setBandSTR = (
    bandKey,
    value
  ) => {
    setForm((f) => ({
      ...f,
      bands: f.bands.map((b) =>
        b.key === bandKey
          ? {
              ...b,
              generatesSTR:
                value === 'generate',
            }
          : b
      ),
    }));
  };

  const save = async () => {
    if (validation.problems.length) {
      setStatus({
        tone: 'error',
        text: 'Fix the highlighted values before saving.',
      });
      return;
    }

    setBusy(true);
    setStatus(null);

    try {
      const saved =
        await api.saveScoringConfig(
          toConfigPayload(
            baseConfig,
            form
          )
        );

      setBaseConfig(saved);
      setForm(toFormState(saved));

      setStatus({
        tone: 'success',
        text: 'Configuration saved. New scores and STRs use these weights.',
      });
    } catch (err) {
      setStatus({
        tone: 'error',
        text: err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setStatus(null);

    try {
      await api.resetScoringConfig();
      await load();

      setStatus({
        tone: 'success',
        text: 'Restored the shipped defaults from risk_bands.yaml.',
      });
    } catch (err) {
      setStatus({
        tone: 'error',
        text: err.message,
      });
    } finally {
      setBusy(false);
    }
  };

  const groupIcons = {
    AF: <FingerprintIcon />,
    FF: <FlowIcon />,
    PH: <ShieldIcon />,
  };

  return (
    <div className={styles.form}>

      {/* ------------------------------------------
          SIGNAL GROUP WEIGHTS
      ------------------------------------------ */}

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <div className={styles.iconCircle}>
            <ScaleIcon />
          </div>

          <div>
            <h3 className={styles.sectionTitle}>
              Signal-group weights
            </h3>

            <p className={styles.sectionBody}>
              How much each engine contributes to the consolidated score. These three must total 1.0.
            </p>
          </div>
        </div>

        <div className={styles.grid3}>
          {GROUPS.map((g) => (
            <NumberField
              key={g.key}
              id={`group-${g.key}`}
              label={`${g.name} (${g.key})`}
              step="0.01"
              min="0"
              max="1"
              value={
                form.groupWeights[g.key]
              }
              invalid={
                num(
                  form.groupWeights[g.key]
                ) < 0 ||
                !validation.groupTotalOk
              }
              onChange={(v) =>
                setGroupWeight(
                  g.key,
                  v
                )
              }
            />
          ))}
        </div>

        <div
          className={
            validation.groupTotalOk
              ? styles.totalOk
              : styles.totalBad
          }
        >
          <span>
            Current total:{' '}
            {validation.groupTotal.toFixed(
              4
            )}{' '}
            —{' '}
            {validation.groupTotalOk
              ? 'balanced'
              : 'must equal 1.0'}
          </span>

          {validation.groupTotalOk && (
            <CheckIcon />
          )}
        </div>
      </section>

      {/* ------------------------------------------
          SIGNAL WEIGHTS
      ------------------------------------------ */}

      {GROUPS.map((g) => (
        <section
          key={g.key}
          className={styles.section}
        >
          <div className={styles.sectionIntro}>
            <div className={styles.iconCircle}>
              {groupIcons[g.key]}
            </div>

            <div>
              <h3 className={styles.sectionTitle}>
                {g.name} signal weights
              </h3>

              <p className={styles.sectionBody}>
                Relative weight of each signal inside the {g.key} sub-score, on a 0–100 scale.
              </p>
            </div>
          </div>

          <div className={styles.grid3}>
            {Object.entries(
              form.signalWeights[g.key] || {}
            ).map(
              ([key, value]) => {
                const {
                  code,
                  label,
                } =
                  describeSignal(
                    key
                  );

                return (
                  <NumberField
                    key={key}
                    id={`signal-${key}`}
                    label={`${code} — ${label}`}
                    step="1"
                    min="0"
                    value={value}
                    invalid={
                      num(value) < 0 ||
                      Number.isNaN(
                        num(value)
                      )
                    }
                    onChange={(v) =>
                      setSignalWeight(
                        g.key,
                        key,
                        v
                      )
                    }
                  />
                );
              }
            )}
          </div>
        </section>
      ))}

      {/* ------------------------------------------
          RISK BAND THRESHOLDS
      ------------------------------------------ */}

      <section className={styles.section}>
        <div className={styles.sectionIntro}>
          <div className={styles.iconCircle}>
            <ThresholdIcon />
          </div>

          <div>
            <h3 className={styles.sectionTitle}>
              Risk-band thresholds
            </h3>

            <p className={styles.sectionBody}>
              Score range for each band. Both bounds are inclusive, and bands must not overlap.
            </p>
          </div>
        </div>

        <div className={styles.bandHeader}>
          <span />
          <span>Lower bound</span>
          <span>Upper bound</span>
          <span>STR behaviour</span>
        </div>

        <div className={styles.bands}>
          {form.bands.map(
            (band) => {
              const source =
                baseConfig.bands.find(
                  (b) =>
                    b.key ===
                    band.key
                );

              const invalid =
                num(band.min) >=
                  num(band.max) ||
                Number.isNaN(
                  num(band.min)
                ) ||
                Number.isNaN(
                  num(band.max)
                );

              return (
                <div
                  key={band.key}
                  className={
                    styles.bandRow
                  }
                >
                  <span
                    className={
                      styles.bandName
                    }
                  >
                    {source?.label ||
                      band.key}
                  </span>

                  <NumberField
                    id={`band-${band.key}-min`}
                    label="Lower bound"
                    step="1"
                    value={band.min}
                    invalid={invalid}
                    onChange={(v) =>
                      setBandBound(
                        band.key,
                        'min',
                        v
                      )
                    }
                  />

                  <NumberField
                    id={`band-${band.key}-max`}
                    label="Upper bound"
                    step="1"
                    value={band.max}
                    invalid={invalid}
                    onChange={(v) =>
                      setBandBound(
                        band.key,
                        'max',
                        v
                      )
                    }
                  />

                  <select
                    className={
                      styles.strSelect
                    }
                    value={
                      band.generatesSTR
                        ? 'generate'
                        : 'none'
                    }
                    onChange={(e) =>
                      setBandSTR(
                        band.key,
                        e.target.value
                      )
                    }
                    aria-label={`${source?.label || band.key} STR behaviour`}
                  >
                    <option value="none">
                      No STR
                    </option>

                    <option value="generate">
                      Generates an STR
                    </option>
                  </select>
                </div>
              );
            }
          )}
        </div>
      </section>

      {/* ------------------------------------------
          VALIDATION ERRORS
      ------------------------------------------ */}

      {!!validation.problems
        .length && (
        <div className={styles.problems}>
          <h3
            className={
              styles.problemsTitle
            }
          >
            Fix before saving
          </h3>

          <ul
            className={
              styles.problemList
            }
          >
            {validation.problems.map(
              (p) => (
                <li key={p}>{p}</li>
              )
            )}
          </ul>
        </div>
      )}

      {status && (
        <Alert tone={status.tone}>
          {status.text}
        </Alert>
      )}

      {/* ------------------------------------------
          ACTIONS
      ------------------------------------------ */}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.save}
          onClick={save}
          disabled={
            busy ||
            validation.problems
              .length > 0
          }
        >
          {busy
            ? 'Working…'
            : 'Save configuration'}
        </button>

        <button
          type="button"
          className={
            styles.resetButton
          }
          onClick={reset}
          disabled={busy}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}