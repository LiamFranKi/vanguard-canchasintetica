import Swal from 'sweetalert2';

// Configuración personalizada para modales
const swalConfig = {
  // Modal de éxito
  success: (title, text = '', options = {}) => {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#22c55e',
      background: '#ffffff',
      color: '#1f2937',
      iconColor: '#22c55e',
      buttonsStyling: true,
      customClass: {
        popup: 'rounded-2xl shadow-2xl',
        title: 'text-2xl font-bold',
        confirmButton: 'px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all !text-white'
      },
      ...options
    });
  },

  // Modal de error
  error: (title, text = '', options = {}) => {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#ef4444',
      background: '#ffffff',
      color: '#1f2937',
      iconColor: '#ef4444',
      buttonsStyling: true,
      customClass: {
        popup: 'rounded-2xl shadow-2xl',
        title: 'text-2xl font-bold',
        confirmButton: 'px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all !text-white'
      },
      ...options
    });
  },

  // Modal de confirmación
  confirm: (title, text = '', options = {}) => {
    return Swal.fire({
      title,
      text,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: options.confirmText || 'Sí, continuar',
      cancelButtonText: options.cancelText || 'Cancelar',
      confirmButtonColor: options.confirmColor || '#22c55e',
      cancelButtonColor: '#6b7280',
      background: '#ffffff',
      color: '#1f2937',
      buttonsStyling: true,
      allowOutsideClick: false,
      allowEscapeKey: true,
      customClass: {
        popup: 'rounded-2xl shadow-2xl swal2-popup-custom',
        title: 'text-2xl font-bold',
        actions: 'swal2-actions-custom'
      },
      didOpen: () => {
        // Forzar estilos después de que se abra el modal
        const confirmBtn = document.querySelector('.swal2-confirm');
        const cancelBtn = document.querySelector('.swal2-cancel');
        if (confirmBtn) {
          confirmBtn.style.cssText = `
            background-color: ${options.confirmColor || '#22c55e'} !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            padding: 0.75rem 1.5rem !important;
            border-radius: 0.75rem !important;
            border: none !important;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 100001 !important;
            position: relative !important;
          `;
        }
        if (cancelBtn) {
          cancelBtn.style.cssText = `
            background-color: #6b7280 !important;
            color: #ffffff !important;
            font-weight: 600 !important;
            padding: 0.75rem 1.5rem !important;
            border-radius: 0.75rem !important;
            border: none !important;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1) !important;
            display: inline-block !important;
            visibility: visible !important;
            opacity: 1 !important;
            z-index: 100001 !important;
            position: relative !important;
          `;
        }
      },
      ...options
    });
  },

  // Modal de advertencia
  warning: (title, text = '', options = {}) => {
    return Swal.fire({
      icon: 'warning',
      title,
      text,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#f59e0b',
      background: '#ffffff',
      color: '#1f2937',
      iconColor: '#f59e0b',
      buttonsStyling: true,
      customClass: {
        popup: 'rounded-2xl shadow-2xl',
        title: 'text-2xl font-bold',
        confirmButton: 'px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all !text-white'
      },
      ...options
    });
  },

  // Toast de éxito
  toastSuccess: (title, text = '') => {
    return Swal.fire({
      icon: 'success',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: '#22c55e',
      color: '#ffffff',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        title: 'font-semibold'
      }
    });
  },

  // Toast de error
  toastError: (title, text = '') => {
    return Swal.fire({
      icon: 'error',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: '#ef4444',
      color: '#ffffff',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        title: 'font-semibold'
      }
    });
  },

  // Toast de información
  toastInfo: (title, text = '') => {
    return Swal.fire({
      icon: 'info',
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: '#3b82f6',
      color: '#ffffff',
      customClass: {
        popup: 'rounded-xl shadow-2xl',
        title: 'font-semibold'
      }
    });
  }
};

export default swalConfig;

