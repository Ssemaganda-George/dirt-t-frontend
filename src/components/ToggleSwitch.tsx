interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label
}: ToggleSwitchProps) {
  const sizeClasses = {
    sm: {
      switch: 'w-8 h-4',
      knob: 'w-3 h-3',
      translate: 'translate-x-4'
    },
    md: {
      switch: 'w-11 h-6',
      knob: 'w-5 h-5',
      translate: 'translate-x-5'
    },
    lg: {
      switch: 'w-14 h-7',
      knob: 'w-6 h-6',
      translate: 'translate-x-7'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className="flex items-center space-x-2">
      {label && (
        <span className="text-sm text-gray-700">{label}</span>
      )}
      <button
        type="button"
        onClick={onChange}
        disabled={disabled}
        className={`
          ${classes.switch}
          relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out
          ${checked ? 'bg-green-500' : 'bg-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
        `}
      >
        <span
          className={`
            ${classes.knob}
            inline-block transform rounded-full bg-white shadow transition-transform duration-200 ease-in-out
            ${checked ? classes.translate : 'translate-x-0.5'}
          `}
        />
      </button>
    </div>
  );
}