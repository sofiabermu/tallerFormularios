## Taller Formularios con validaciones

## Nivel 1 · HTML puro

# ¿Qué pasa si borras el atributo `name` de un campo y envías?

Cuando se prueba, el campo simplemente no se envía. El navegador lo sigue validando (si es obligatorio y está vacío no se deja enviar), pero en DevTools › Red ese dato no aparece en la petición.

La razón es que el formulario arma lo que envía con parejas `name=valor`. El `id` sirve para conectar el `label` y para usarlo en CSS o JS, pero no le pone nombre al dato. Si el campo no tiene `name`, el navegador no tiene con qué etiquetarlo y lo deja por fuera. Pasa lo mismo con `new FormData(form)`. Por eso mismo tampoco se envían los campos `disabled` ni los checkbox que no están marcados.

---

## Nivel 2 · Mensajes propios

# ¿`:user-invalid` o `:invalid`?

Cuando se cambia `:user-invalid` por `:invalid` y se recarga, todos los campos obligatorios aparecieron en rojo inmediatamente, sin haber escrito nada. Eso pasa porque `:invalid` muestra el estado real del campo todo el tiempo, y un campo obligatorio vacío ya es inválido desde que carga la página.

Con `:user-invalid` el rojo solo aparece después de que la persona toca el campo y sale de él (o intenta enviar).

---

## Nivel 3 · Envío con fetch

## ¿Por qué se escucha `submit` en el formulario y no `click` en el botón?

Porque no siempre se envía con un clic. Si se está escribiendo en un campo y se oprime **Enter**, el formulario se envía sin que nadie toque el botón. Si solo escuchara el `click`, ese envío se escaparía. El navegador haría el envío normal y la página se recargaría. El evento `submit` salta siempre que el formulario se envía, sin importar cómo, y ahí es donde `e.preventDefault()` evita la recarga.

### Prueba con la URL rota

Cuando se cambia la URL por `https://jsonplaceholder.typicode.com/no-existe`. El servidor responde 404, pero `fetch` no lo toma como error (solo falla cuando no hay red), por eso hay que revisar `res.ok`. Con eso el usuario ve el mensaje: el servidor no pudo crear la cuenta (HTTP 404). Inténtalo de nuevo en unos minutos, y en la consola queda el `Error: HTTP 404`. Con DevTools en modo *Offline* el mensaje cambia a: No se pudo enviar. Revisa tu conexión e inténtalo de nuevo. En los dos casos el botón vuelve a activarse y los datos siguen escritos.

---

## Nivel 4 · Validación en JavaScript

## ¿Qué ventaja tiene que las reglas sean funciones puras?

Que no dependen de nada más que de lo que reciben, no tocan el DOM ni la red. Con los mismos datos siempre dan el mismo resultado. En la práctica eso sirve para:

- Probarlas sin abrir el navegador. Por ejemplo, `validarCampo('edad', { edad: '17' })` devuelve que el valor mínimo es 18, y se puede revisar con Node.
- Reutilizarlas en otro lado, incluso en el backend.
- Tener las reglas en un solo lugar. Si se quiere cambiar una, se cambie en `validaciones.js` y no hay que buscarla por todo el código.

### ¿Por qué «el correo ya existe» no se puede validar solo con HTML?

Porque los atributos de HTML solo miran el valor del campo y lo revisan ahí mismo, en el navegador. Para saber si un correo ya tiene cuenta hay que preguntarle al servidor, que es el que tiene la lista de usuarios, y esa respuesta tarda en llegar. Ningún atributo puede hacer una petición ni esperar una respuesta, así que eso solo se puede hacer con JavaScript.

---

## Nivel 5 · Seguridad y usabilidad

### Parte A · La validación del navegador no es seguridad


**Qué demuestra esto:** que todo lo que pasa en el navegador lo controla quien lo usa. Puede editar el HTML, usar la consola o mandar la petición con Postman o `curl`. La validación del frontend sirve para que la persona sepa rápido qué está mal, pero no protege nada. Al servidor le puede llegar cualquier cosa.

**Qué tiene que hacer el backend:**

1. **Volver a validar todo con las mismas reglas.** Como `validaciones.js` no usa el DOM, se podría usar tal cual en un servidor con Node:

   ```js
   import { validarFormulario } from './validaciones.js';

   const errores = validarFormulario(req.body);
   if (Object.keys(errores).length > 0) {
     return res.status(422).json({ errores });
   }
   ```

2. **Usar consultas parametrizadas.** Si la consulta se arma pegando textos, el dato se mezcla con el SQL:

   ```js
   // Mal: el dato queda dentro del SQL
   const sql = "SELECT * FROM usuarios WHERE email = '" + email + "'";
   // Si alguien escribe  ' OR '1'='1  la consulta queda:
   // SELECT * FROM usuarios WHERE email = '' OR '1'='1'
   // y como '1'='1' siempre es verdad, devuelve todos los usuarios.

   // Bien: el SQL lleva un marcador y el dato va aparte
   const resultado = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
   ```

   En una consulta parametrizada la base de datos recibe primero la consulta con el hueco (`$1`) y después el valor por separado. Como ya sabe cuál es la estructura de la consulta antes de ver el dato, el texto `' OR '1'='1` se trata como un correo cualquiera que no existe, nunca como código. Y esto no lo puede evitar la validación del navegador, porque se salta fácil.

### Parte B · XSS

Después de registrarse aparece un saludo con el nombre escribiendo `<b>Ana</b>` como nombre:

- Con `textContent` se ve literalmente `Hola, <b>Ana</b>`, con los signos `<` y `>`. El navegador lo trata como texto.
- Con `innerHTML` se ve «Hola, **Ana**» en negrita, porque el navegador interpreta lo que escribió el usuario como HTML. Parece inofensivo, pero si en vez de `<b>` alguien escribe `<img src=x onerror="alert(document.cookie)">`, ese código se ejecuta. Eso es XSS.


### Parte C · Prueba de usabilidad

| Observación | Campo | Problema | Corrección aplicada |
|---|---|---|---|
| 1 | Teléfonos (botón «Quitar») | Usando solo el teclado, al quitar un teléfono el foco se perdía y tenía que volver a empezar con Tab desde arriba. | Al quitar una fila, el foco vuelve al botón «Agregar teléfono». |
| 2 | Acepto términos | Cuando intentó enviar sin marcarlo, no se dio cuenta de cuál era el error porque el borde rojo casi no se nota en un checkbox. | Se agrandó el checkbox y se le puso un anillo rojo cuando tiene error, además del mensaje «Acepta los términos para continuar.». |
| 3 | Correo | Mientras salía «Comprobando disponibilidad…» pensó que era un error porque estaba en rojo. | Ese aviso ahora sale en gris y no marca el campo como inválido; el rojo queda solo para errores reales. |
| 4 | Teléfono | Escribió el número con espacios y el mensaje no le decía qué estaba mal. | El mensaje ahora explica: «Escribe de 7 a 15 dígitos, sin espacios ni guiones (puede empezar con +).». |

Con la edad 16 no tuvo problema: el mensaje «El valor mínimo es 18.» le dejó claro qué corregir.

---

