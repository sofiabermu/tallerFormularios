// validaciones.js
// Todas las reglas del formulario en un solo lugar.
// Cada regla es una función pura: recibe (valor, datos) y devuelve un mensaje de error o null.
// No tocan el DOM, así que se pueden reutilizar (por ejemplo, en el backend) y probar fácilmente.

export const requerido = (msg = 'Este campo es obligatorio.') =>
  (v) => (v === undefined || v === null || String(v).trim() === '' ? msg : null);

export const longitud = (min, max) =>
  (v) => (v.length < min ? `Usa al menos ${min} caracteres.`
    : v.length > max ? `Usa como máximo ${max} caracteres.` : null);

export const formatoCorreo = () =>
  (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'Escribe un correo válido, por ejemplo ana@mail.com.');

export const letraYNumero = () =>
  (v) => (/[A-Za-z]/.test(v) && /\d/.test(v) ? null : 'Incluye al menos una letra y un número.');

export const rangoEntero = (min, max) => (v) => {
  const n = Number(v);
  if (!Number.isInteger(n)) return 'Escribe un número entero.';
  if (n < min) return `El valor mínimo es ${min}.`;
  if (n > max) return `El valor máximo es ${max}.`;
  return null;
};

export const igualA = (otroCampo, msg) =>
  (v, datos) => (v === datos[otroCampo] ? null : msg);

// Un checkbox marcado llega en FormData con el valor 'on'; si no está marcado, no llega
export const marcado = (msg) =>
  (v) => (v === 'on' ? null : msg);

// De 7 a 15 dígitos, con un + opcional al inicio
export const formatoTelefono = () =>
  (v) => (/^\+?\d{7,15}$/.test(v) ? null : 'Escribe de 7 a 15 dígitos, sin espacios ni guiones (puede empezar con +).');

// Las 7 reglas del registro en un solo lugar
export const reglas = {
  nombre: [requerido(), longitud(3, 60)],
  email: [requerido(), formatoCorreo()],
  password: [requerido(), longitud(8, 64), letraYNumero()],
  confirmar: [requerido(), igualA('password', 'Las contraseñas no coinciden.')],
  edad: [requerido(), rangoEntero(18, 120)],
  pais: [requerido('Elige un país.')],
  terminos: [marcado('Acepta los términos para continuar.')],
};

// Cada teléfono dinámico se valida por separado con estas reglas
export const reglasTelefono = [
  requerido('Escribe un teléfono o quita este campo.'),
  formatoTelefono(),
];

// Devuelve el primer error de una lista de reglas, o null
function primerError(lista, valor, datos) {
  for (const regla of lista) {
    const error = regla(valor ?? '', datos);
    if (error) return error;
  }
  return null;
}

// Devuelve el primer error del campo, o null
export function validarCampo(nombre, datos) {
  return primerError(reglas[nombre] ?? [], datos[nombre], datos);
}

// Devuelve el primer error de un teléfono, o null
export function validarTelefono(valor) {
  return primerError(reglasTelefono, valor);
}

// Devuelve un objeto { campo: mensaje } solo con los campos con error
export function validarFormulario(datos) {
  const errores = {};
  for (const nombre of Object.keys(reglas)) {
    const error = validarCampo(nombre, datos);
    if (error) errores[nombre] = error;
  }
  return errores;
}
