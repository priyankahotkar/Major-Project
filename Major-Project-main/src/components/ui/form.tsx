interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export function Input({ label, error, helper, className = '', ...props }: InputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        className={`
          block w-full px-4 py-2 text-gray-900 border rounded-lg 
          focus:ring-2 focus:ring-offset-2 focus:outline-none
          ${error 
            ? 'border-red-300 focus:border-red-300 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-300 focus:ring-blue-500'
          }
          ${className}
        `}
        {...props}
      />
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export function Textarea({ label, error, helper, className = '', ...props }: TextareaProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        className={`
          block w-full px-4 py-2 text-gray-900 border rounded-lg 
          focus:ring-2 focus:ring-offset-2 focus:outline-none
          ${error 
            ? 'border-red-300 focus:border-red-300 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-300 focus:ring-blue-500'
          }
          ${className}
        `}
        {...props}
      />
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({ label, error, helper, options, className = '', ...props }: SelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <select
        className={`
          block w-full px-4 py-2 text-gray-900 border rounded-lg 
          focus:ring-2 focus:ring-offset-2 focus:outline-none
          ${error 
            ? 'border-red-300 focus:border-red-300 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-300 focus:ring-blue-500'
          }
          ${className}
        `}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {helper && !error && (
        <p className="text-sm text-gray-500">{helper}</p>
      )}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}