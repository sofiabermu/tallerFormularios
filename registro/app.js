// app.js

import { validarCampo, validarTelefono, validarFormulario } from './validaciones.js';

const form = document.querySelector('#registro');
const boton = form.querySelector('button[type="submit"]');
const mensaje = document.querySelector('#mensaje');
const saludo = document.querySelector('#saludo');
const campoEmail = form.elements.email;
const listaTelefonos = document.querySelector('#telefonos');
const botonAgregarTelefono = document.querySelector('#agregar-telefono');
const MAX_TELEFONOS = 3;


function leerDatos() {
  const fd = new FormData(form);
  return { ...Object.fromEntries(fd), telefono: fd.getAll('telefono') };
}

function datosParaEnviar(datos) {
  const copia = { ...datos };
  delete copia.confirmar;
  return copia;
}

// cada campo validable tiene name y apunta a su contenedor de error 
const contenedorDe = (campo) => document.getElementById(campo.getAttribute('aria-describedby'));
const camposValidables = () => [...form.querySelectorAll('[name][aria-describedby]')];

// un aviso se escribe en el mismo lugar pero no marca el campo en rojo
function mostrarError(campo, texto, { aviso = false } = {}) {
  campo.setAttribute('aria-invalid', texto && !aviso ? 'true' : 'false');
  const contenedor = contenedorDe(campo);
  contenedor.classList.toggle('aviso', aviso);
  contenedor.textContent = texto ?? '';
}

// los telefonos tienen su propia lista de reglas
function errorDe(campo, datos) {
  return campo.name === 'telefono' ? validarTelefono(campo.value) : validarCampo(campo.name, datos);
}

function erroresDelFormulario(datos) {
  const errores = validarFormulario(datos);
  for (const telefono of listaTelefonos.querySelectorAll('input')) {
    const error = validarTelefono(telefono.value);
    if (error) errores[telefono.id] = error;
  }
  return errores;
}

// pintar  el mensaje de cada campo y devuelve el primero con error
function mostrarErrores(errores) {
  const campos = camposValidables();
  campos.forEach((campo) => mostrarError(campo, errores[campo.id]));
  return campos.find((campo) => errores[campo.id]);
}

// validar al salir del campo¿
form.addEventListener('focusout', (e) => {
  const campo = e.target;
  if (!campo.name) return;
  const datos = leerDatos();
  const error = errorDe(campo, datos);
  // si el correo tiene buen formato el mensaje lo decide la comprobacion de disponibilidad
  if (campo === campoEmail && !error) return;
  mostrarError(campo, error);
  // la confirmación depende de la contraseña o sea si cambia la contraseña se revisa otra vez
  if (campo.name === 'password' && datos.confirmar) {
    mostrarError(form.elements.confirmar, validarCampo('confirmar', datos));
  }
});


//  correos ya  registrados
const registrados = ['ana@mail.com', 'admin@mail.com'];
const MENSAJE_CORREO_OCUPADO = 'Este correo ya tiene una cuenta. ¿Quieres iniciar sesión?';

function correoDisponible(email) {
  console.info(`Consultando disponibilidad de ${email}`);
  return new Promise((ok) =>
    setTimeout(() => ok(!registrados.includes(email.toLowerCase())), 600));
}

// ejecuta fn solo cuando han pasado ms milisegundos sin una nueva llamada
function debounce(fn, ms) {
  let espera;
  return (...args) => {
    clearTimeout(espera);
    espera = setTimeout(() => fn(...args), ms);
  };
}

// lee el valor al ejecutarse  para no comprobar un correo que ya no está escrito
const revisarCorreo = debounce(async () => {
  const email = campoEmail.value;
  if (validarCampo('email', { email })) {
    mostrarError(campoEmail, null);
    return;
  }
  mostrarError(campoEmail, 'Comprobando disponibilidad…', { aviso: true });
  const libre = await correoDisponible(email);
  if (campoEmail.value !== email) return;
  mostrarError(campoEmail, libre ? null : MENSAJE_CORREO_OCUPADO);
}, 500);

campoEmail.addEventListener('input', revisarCorreo);


// los ids y los textos con número los pone numerarTelefonos()
function crearFilaTelefono() {
  const fila = document.createElement('div');
  fila.className = 'fila-telefono';
  const input = Object.assign(document.createElement('input'), {
    name: 'telefono', type: 'tel', inputMode: 'tel', autocomplete: 'tel',
  });
  const quitar = Object.assign(document.createElement('button'), {
    type: 'button', className: 'quitar secundario', textContent: 'Quitar',
  });
  const error = Object.assign(document.createElement('p'), { className: 'error' });
  error.setAttribute('aria-live', 'polite');
  fila.append(document.createElement('label'), input, quitar, error);
  return fila;
}

// ids, etiquetas y enlaces aria siguen el orden visible

function numerarTelefonos() {
  [...listaTelefonos.children].forEach((fila, i) => {
    const id = `tel-${i + 1}`;
    const label = fila.querySelector('label');
    const input = fila.querySelector('input');
    label.htmlFor = id;
    label.textContent = `Teléfono ${i + 1}`;
    input.id = id;
    input.setAttribute('aria-describedby', `${id}-error`);
    fila.querySelector('.error').id = `${id}-error`;
    fila.querySelector('.quitar').setAttribute('aria-label', `Quitar teléfono ${i + 1}`);
  });
  botonAgregarTelefono.disabled = listaTelefonos.children.length >= MAX_TELEFONOS;
}

botonAgregarTelefono.addEventListener('click', () => {
  if (listaTelefonos.children.length >= MAX_TELEFONOS) return;
  const fila = crearFilaTelefono();
  listaTelefonos.append(fila);
  numerarTelefonos();
  fila.querySelector('input').focus();
});

//  un solo listener para todos los botones quitar
listaTelefonos.addEventListener('click', (e) => {
  if (!e.target.matches('.quitar')) return;
  e.target.closest('.fila-telefono').remove();
  numerarTelefonos();
  botonAgregarTelefono.focus(); // el botón pulsado desaparece
});

function quitarTodosLosTelefonos() {
  listaTelefonos.replaceChildren();
  numerarTelefonos();
}

// bloquea el boton mientras se envia para evitar el doble envio
function marcarEnviando(enviando) {
  boton.disabled = enviando;
  boton.textContent = enviando ? 'Enviando…' : 'Crear cuenta';
}

// fetch  falla  si no hay red
//  revisar res.ok y lanzar el error 
async function enviar(datos) {
  const res = await fetch(form.action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
//mensaje de fallo
function mensajeDeFallo(err) {
  return err.message.startsWith('HTTP')
    ? `El servidor no pudo crear la cuenta (${err.message}). Inténtalo de nuevo mas tarde`
    : 'No fue posible enviarlo, revisa tu conexión e inténtalo de nuevo.';
}

function saludar(nombre) {
  saludo.textContent = `Hola, ${nombre}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  mensaje.textContent = '';
  saludo.textContent = '';
  const datos = leerDatos();
  const primerCampoConError = mostrarErrores(erroresDelFormulario(datos));
  if (primerCampoConError) {
    primerCampoConError.focus(); // llevar al primer error
    return;
  }

  marcarEnviando(true);
  try {
    // el formato puede estar bien y aun asi el correo ya tener cuenta
    if (!(await correoDisponible(datos.email))) {
      mostrarError(campoEmail, MENSAJE_CORREO_OCUPADO);
      campoEmail.focus();
      return;
    }
    const creado = await enviar(datosParaEnviar(datos));
    mensaje.textContent = `¡Cuenta creada! Id: ${creado.id}`;
    saludar(datos.nombre);
    form.reset();
    quitarTodosLosTelefonos();
  } catch (err) {
    mensaje.textContent = mensajeDeFallo(err);
    console.error(err); // detalle  para depurar
  } finally {
    marcarEnviando(false);
  }
});
