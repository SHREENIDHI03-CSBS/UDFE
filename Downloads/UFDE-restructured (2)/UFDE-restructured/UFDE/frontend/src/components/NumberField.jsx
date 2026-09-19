import styles from './NumberField.module.css';

/**
 * A single labelled numeric input. Values are held as strings so a partially
 * typed number ("0." or "-") does not get clobbered while editing.
 */
export default function NumberField({ id, label, hint, value, onChange, step = 1, min, max, invalid = false, suffix }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <div className={styles.inputRow}>
        <input
          id={id}
          className={invalid ? styles.inputInvalid : styles.input}
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          max={max}
          value={value}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </div>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
