// app.js
// Conecta el formulario con las reglas de validaciones.js.
// Aquí NO hay reglas de validación: solo se leen datos, se muestran mensajes y se envía.
import { validarCampo, validarTelefono, validarFormulario } from './validaciones.js';

const form = document.querySelector('#registro');
const boton = form.querySelector('button[type="submit"]');
const mensaje = document.querySelector('#mensaje');
const saludo = document.querySelector('#saludo');
const campoEmail = form.elements.email;
const listaTelefonos = document.querySelector('#telefonos');
const botonAgregarTelefono = document.querySelector('#agregar-telefono');
const MAX_TELEFONOS = 3;

// ---------- Leer datos ----------

// Object.fromEntries se queda solo con el último valor de los campos repetidos,
// por eso los teléfonos se leen aparte con getAll() y quedan como lista
function leerDatos() {
  const fd = new FormData(form);
  return { ...Object.fromEntries(fd), telefono: fd.getAll('telefono') };
}

// La confirmación solo sirve en el cliente: no se envía
function datosParaEnviar(datos) {
  const copia = { ...datos };
  delete copia.confirmar;
  return copia;
}

// ---------- Mostrar mensajes ----------

// Cada campo validable tiene name y apunta a su contenedor de error con aria-describedby
const contenedorDe = (campo) => document.getElementById(campo.getAttribute('aria-describedby'));
const camposValidables = () => [...form.querySelectorAll('[name][aria-describedby]')];

// Un aviso (por ejemplo «Comprobando…») se escribe en el mismo lugar pero no marca el campo en rojo
function mostrarError(campo, texto, { aviso = false } = {}) {
  campo.setAttribute('aria-invalid', texto && !aviso ? 'true' : 'false');
  const contenedor = contenedorDe(campo);
  contenedor.classList.toggle('aviso', aviso);
  contenedor.textContent = texto ?? '';
}

// Los teléfonos tienen su propia lista de reglas; el resto se valida por name
function errorDe(campo, datos) {
  return campo.name === 'telefono' ? validarTelefono(campo.value) : validarCampo(campo.name, datos);
}

// Errores de las 7 reglas más los de cada teléfono, con el id del campo como clave
// (en los 7 campos fijos el id es igual al name)
function erroresDelFormulario(datos) {
  const errores = validarFormulario(datos);
  for (const telefono of listaTelefonos.querySelectorAll('input')) {
    const error = validarTelefono(telefono.value);
    if (error) errores[telefono.id] = error;
  }
  return errores;
}

// Pinta (o limpia) el mensaje de cada campo y devuelve el primero con error, en orden visual
function mostrarErrores(errores) {
  const campos = camposValidables();
  campos.forEach((campo) => mostrarError(campo, errores[campo.id]));
  return campos.find((campo) => errores[campo.id]);
}

// Validar al salir del campo, no a cada tecla
form.addEventListener('focusout', (e) => {
  const campo = e.target;
  if (!campo.name) return;
  const datos = leerDatos();
  const error = errorDe(campo, datos);
  // Si el correo tiene buen formato, el mensaje lo decide la comprobación de disponibilidad
  if (campo === campoEmail && !error) return;
  mostrarError(campo, error);
  // La confirmación depende de la contraseña: si cambia la contraseña, se revisa otra vez
  if (campo.name === 'password' && datos.confirmar) {
    mostrarError(form.elements.confirmar, validarCampo('confirmar', datos));
  }
});

// ---------- Correo: comprobación asíncrona ----------

// Simula al servidor: estos correos ya están registrados
const registrados = ['ana@mail.com', 'admin@mail.com'];
const MENSAJE_CORREO_OCUPADO = 'Este correo ya tiene una cuenta. ¿Quieres iniciar sesión?';

function correoDisponible(email) {
  console.info(`Consultando disponibilidad de ${email}`);
  return new Promise((ok) =>
    setTimeout(() => ok(!registrados.includes(email.toLowerCase())), 600));
}

// Ejecuta fn solo cuando han pasado ms milisegundos sin una nueva llamada
function debounce(fn, ms) {
  let espera;
  return (...args) => {
    clearTimeout(espera);
    espera = setTimeout(() => fn(...args), ms);
  };
}

// Lee el valor al ejecutarse (no al teclear) para no comprobar un correo que ya no está escrito
const revisarCorreo = debounce(async () => {
  const email = campoEmail.value;
  // Primero el formato. Mientras escribe no lo regañamos: el error de formato sale al salir del campo
  if (validarCampo('email', { email })) {
    mostrarError(campoEmail, null);
    return;
  }
  mostrarError(campoEmail, 'Comprobando disponibilidad…', { aviso: true });
  const libre = await correoDisponible(email);
  // Condición de carrera: si la persona siguió escribiendo, esta respuesta ya es vieja
  if (campoEmail.value !== email) return;
  mostrarError(campoEmail, libre ? null : MENSAJE_CORREO_OCUPADO);
}, 500);

campoEmail.addEventListener('input', revisarCorreo);

// ---------- Teléfonos dinámicos ----------

// Nivel 5: antes la fila se armaba con innerHTML (era seguro porque el texto lo ponía nuestro
// código). Con createElement no hay HTML que interpretar, así que ese riesgo desaparece del todo.
// Los ids y los textos con número los pone numerarTelefonos()
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

// Ids, etiquetas y enlaces aria siguen el orden visible: al quitar uno, los demás se renumeran
// (así nunca hay dos campos con el mismo id)
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

// Delegación de eventos: un solo listener para todos los botones «Quitar»
listaTelefonos.addEventListener('click', (e) => {
  if (!e.target.matches('.quitar')) return;
  e.target.closest('.fila-telefono').remove();
  numerarTelefonos();
  botonAgregarTelefono.focus(); // el botón pulsado desapareció: el foco no debe perderse
});

function quitarTodosLosTelefonos() {
  listaTelefonos.replaceChildren();
  numerarTelefonos();
}

// ---------- Envío ----------

// Bloquea el botón mientras se envía para evitar el doble envío
function marcarEnviando(enviando) {
  boton.disabled = enviando;
  boton.textContent = enviando ? 'Enviando…' : 'Crear cuenta';
}

// fetch solo falla (rechaza la promesa) si no hay red: un 404 o un 500 llega
// como respuesta normal, por eso revisamos res.ok y lanzamos el error nosotros
async function enviar(datos) {
  const res = await fetch(form.action, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Mensaje amigable: distingue "el servidor respondió con error" de "no hay red"
function mensajeDeFallo(err) {
  return err.message.startsWith('HTTP')
    ? `El servidor no pudo crear la cuenta (${err.message}). Inténtalo de nuevo en unos minutos.`
    : 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.';
}

// Saludo tras el registro. El nombre lo escribió el usuario, así que va SIEMPRE con textContent:
// el texto se muestra tal cual y «<b>Ana</b>» se ve con los signos < >, sin ejecutarse.
//
// Versión INSEGURA (solo como ejemplo, nunca activa):
//   saludo.innerHTML = `Hola, ${nombre}`;
// innerHTML interpreta el texto como HTML: «<b>Ana</b>» saldría en negrita, y algo como
// «<img src=x onerror="alert(document.cookie)">» ejecutaría JavaScript (XSS).
function saludar(nombre) {
  saludo.textContent = `Hola, ${nombre}`;
}

// Escuchamos submit en el form (no click en el botón): así también cubre la tecla Enter
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
    // El formato puede estar bien y aun así el correo ya tener cuenta
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
    // No hacemos reset: los datos escritos se quedan para reintentar
    mensaje.textContent = mensajeDeFallo(err);
    console.error(err); // detalle técnico para depurar
  } finally {
    marcarEnviando(false);
  }
});
