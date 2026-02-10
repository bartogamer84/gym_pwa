const SYSTEM_PROMPT = `
Eres un asistente virtual especializado EXCLUSIVAMENTE en temas de gimnasio.

SOLO puedes responder preguntas relacionadas con:
- Rutinas de entrenamiento
- Ejercicios de gimnasio
- Pesos, repeticiones y progresión
- Técnica correcta de ejercicios
- Consejos básicos para entrenar

REGLA OBLIGATORIA:
Si el usuario pregunta algo que NO esté relacionado con gimnasio,
responde exactamente:
"No puedo responder a eso. Solo puedo ayudarte con temas de entrenamiento y gimnasio."
`;

async function preguntarAlBot(mensajeUsuario) {
    try {
        // Llamar al proxy en Vercel en lugar de OpenRouter directamente
        const proxyURL = 'https://gym-pwa-seven.vercel.app/api/openrouter';
        
        const response = await fetch(proxyURL, {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'tngtech/deepseek-r1t-chimera:free',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: mensajeUsuario }
                ]
            })
        });

        const data = await response.json();
        console.log("Respuesta OpenRouter:", data);

        // Validar estructura de respuesta
        if (!response.ok) {
            const error = data.error?.message || "Error desconocido en OpenRouter";
            throw new Error(`OpenRouter error (${response.status}): ${error}`);
        }

        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            console.error("Estructura inesperada:", data);
            throw new Error("Estructura de respuesta inesperada. Verifica la consola para más detalles.");
        }

        // Extraer el contenido (deepseek-r1 puede devolver con <think> tags)
        let content = data.choices[0].message.content;
        
        // Si contiene tags <think>, extraer solo la respuesta
        if (content.includes("<think>")) {
            content = content.split("</think>")[1]?.trim() || content;
        }

        // Limpiar contenido de email/basura al final
        // Eliminar todo después de patrones comunes de email
        const emailPatterns = [
            /\s*@gmail\.com.*$/gmis,  // @gmail.com y todo después
            /\s*escribió:.*$/gmis,     // "escribió:" y todo después
            /\s*El \d+ \w+ \d+.*$/gmis, // "El 17 jun 2024..." y todo después
            /\s*--[\s\S]*$/gmis        // Separador de email "-- " y todo después
        ];

        emailPatterns.forEach(pattern => {
            content = content.replace(pattern, "");
        });

        content = content.trim();

        return content || "No se obtuvo respuesta del bot.";
    } catch (error) {
        console.error("Error en preguntarAlBot:", error);
        return `Error: ${error.message}. Intenta de nuevo.`;
    }
}

// Registrar el Service Worker para que funcione Offline
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
        .then(() => console.log("Service Worker registrado"))
        .catch(() => {});
}

// Modelo de datos inicial
let rutinas = JSON.parse(localStorage.getItem('rutinas')) || [];

// Normalizar datos antiguos/incorrectos guardados en localStorage
function normalizeRutinas() {
    rutinas = (rutinas || []).map(r => {
        r.ejercicios = Array.isArray(r.ejercicios) ? r.ejercicios : [];
        r.ejercicios = r.ejercicios.map(e => {
            // compatibilidad con estructuras antiguas
            if (!e.nombre && e.ejNombre) e.nombre = e.ejNombre;
            if (!e.id) e.id = Date.now() + Math.floor(Math.random() * 999);

            if (!Array.isArray(e.series)) {
                if (typeof e.sets === 'number') {
                    const arr = [];
                    for (let i = 0; i < e.sets; i++) arr.push({ kg: e.peso || 0, reps: e.reps || 0, completado: false });
                    e.series = arr;
                } else if (e.kg != null || e.reps != null || e.peso != null) {
                    e.series = [{ kg: e.kg || e.peso || 0, reps: e.reps || 0, completado: false }];
                } else {
                    e.series = [];
                }
            }
            return e;
        });
        return r;
    });
}

// Normalizar al inicio
normalizeRutinas();

// Estado de la app: 'home' o 'routine'
const appState = { view: 'home', rutinaId: null };

function crearRutina(nombre) {
    const nuevaRutina = {
        id: Date.now(),
        nombre: nombre,
        ejercicios: []
    };
    rutinas.push(nuevaRutina);
    guardarYRenderizar();
}

function agregarEjercicio(rutinaId, nombreEj) {
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina) return;
    const ejercicio = {
        id: Date.now() + Math.floor(Math.random() * 999),
        nombre: nombreEj,
        series: [ { kg: 0, reps: 0, completado: false } ]
    };
    rutina.ejercicios.push(ejercicio);
    guardarYRenderizar();
}

function agregarSerie(rutinaId, ejercicioId) {
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina) return;
    const ejercicio = rutina.ejercicios.find(e => e.id === ejercicioId);
    if (!ejercicio) return;
    const last = ejercicio.series[ejercicio.series.length - 1] || { kg: 0, reps: 0 };
    ejercicio.series.push({ kg: last.kg || 0, reps: last.reps || 0, completado: false });
    guardarYRenderizar();
}

function eliminarSerie(rutinaId, ejercicioId, serieIndex) {
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina) return;
    const ejercicio = rutina.ejercicios.find(e => e.id === ejercicioId);
    if (!ejercicio) return;
    ejercicio.series.splice(serieIndex, 1);
    guardarYRenderizar();
}

function actualizarSerie(rutinaId, ejercicioId, serieIndex, field, value) {
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina) return;
    const ejercicio = rutina.ejercicios.find(e => e.id === ejercicioId);
    if (!ejercicio) return;
    const serie = ejercicio.series[serieIndex];
    if (!serie) return;
    if (field === 'kg' || field === 'reps') serie[field] = Number(value) || 0;
    if (field === 'completado') serie.completado = Boolean(value);
    guardarYRenderizar(false);
}

function guardarYRenderizar(save = true) {
    if (save) localStorage.setItem('rutinas', JSON.stringify(rutinas));
    render();
}

function crearElemento(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
        if (k.startsWith('data-')) el.setAttribute(k, v);
        else if (k === 'class') el.className = v;
        else if (k === 'html') el.innerHTML = v;
        else el[k] = v;
    });
    children.forEach(c => { if (c !== undefined && c !== null) el.append(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
}

function render() {
    const contenedor = document.getElementById('app');
    contenedor.innerHTML = '';

    if (appState.view === 'home') return renderHome(contenedor);
    if (appState.view === 'routine') return renderRoutineView(contenedor, appState.rutinaId);
}

function renderHome(contenedor) {
    // Controls row
    const topRow = crearElemento('div');
    const btnNueva = crearElemento('button', { class: 'primary' }, 'Nueva Rutina');
    btnNueva.onclick = () => {
        const nom = prompt('Nombre de la rutina:');
        if (nom) { crearRutina(nom); appState.view = 'home'; }
    };
    const btnExplorar = crearElemento('button', { class: 'small-btn' }, 'Explorar');
    topRow.appendChild(btnNueva);
    topRow.appendChild(btnExplorar);
    contenedor.appendChild(topRow);

    const title = crearElemento('h2', {}, 'Rutinas');
    contenedor.appendChild(title);

    if (!rutinas || rutinas.length === 0) {
        contenedor.appendChild(crearElemento('div', { class: 'muted' }, 'Añade una rutina para empezar.'));
        return;
    }

    rutinas.forEach(r => {
        const card = crearElemento('div', { class: 'rutina-card' });
        const name = crearElemento('div', { class: 'rutina-title' }, r.nombre);
        const desc = crearElemento('div', { class: 'muted' }, (r.ejercicios || []).slice(0,4).map(e => e.nombre).join(', '));

        const controls = crearElemento('div', { class: 'controls' });
        const start = crearElemento('button', { class: 'primary' }, 'Empezar Rutina');
        start.onclick = () => { appState.view = 'routine'; appState.rutinaId = r.id; guardarYRenderizar(false); };

        const delRut = crearElemento('button', { class: 'small-btn' }, 'Eliminar');
        delRut.onclick = () => {
            if (!confirm('Eliminar rutina "' + r.nombre + '"?')) return;
            rutinas = rutinas.filter(x => x.id !== r.id);
            guardarYRenderizar();
        };

        controls.appendChild(start);
        controls.appendChild(delRut);

        card.appendChild(name);
        card.appendChild(desc);
        card.appendChild(controls);
        contenedor.appendChild(card);
    });
}

function renderRoutineView(contenedor, rutinaId) {
    const rutina = rutinas.find(x => x.id === rutinaId);
    if (!rutina) { appState.view = 'home'; return renderHome(contenedor); }

    const header = crearElemento('div', { class: 'rutina-header' });
    const title = crearElemento('div', { class: 'rutina-title' }, rutina.nombre);
    const back = crearElemento('button', { class: 'small-btn' }, '← Volver');
    back.onclick = () => { appState.view = 'home'; appState.rutinaId = null; guardarYRenderizar(false); };
    header.appendChild(title);

    // Botón para añadir ejercicio visible cuando la rutina está vacía o no
    const addEjBtn = crearElemento('button', { class: 'primary' }, '+ Agregar Ejercicio');
    addEjBtn.onclick = () => {
        const nombre = prompt('Nombre del ejercicio:');
        if (nombre) {
            agregarEjercicio(rutina.id, nombre);
            // mantener la vista en la misma rutina
            appState.view = 'routine';
            appState.rutinaId = rutina.id;
        }
    };

    header.appendChild(addEjBtn);
    header.appendChild(back);
    contenedor.appendChild(header);

    // Ahora renderizamos los ejercicios como antes
    const rc = crearElemento('div');
    (rutina.ejercicios || []).forEach(ej => {
        const card = crearElemento('div', { class: 'exercise-card' });
        const eh = crearElemento('div', { class: 'exercise-header' });
        const name = crearElemento('div', {}, '💪 ' + ej.nombre);
        const exControls = crearElemento('div', { class: 'controls' });

        const btnAddSet = crearElemento('button', { class: 'small-btn' }, '+ Serie');
        btnAddSet.onclick = () => agregarSerie(rutina.id, ej.id);
        const btnDelEj = crearElemento('button', { class: 'small-btn' }, 'Eliminar');
        btnDelEj.onclick = () => { rutina.ejercicios = rutina.ejercicios.filter(x => x.id !== ej.id); guardarYRenderizar(); };

        exControls.appendChild(btnAddSet);
        exControls.appendChild(btnDelEj);
        eh.appendChild(name);
        eh.appendChild(exControls);
        card.appendChild(eh);

        const headerRow = crearElemento('div', { class: 'set-row', html: '' });
        headerRow.style.color = 'var(--text-dim)';
        headerRow.style.fontSize = '0.85rem';
        headerRow.innerHTML = '<div>SERIE</div><div>ANTERIOR</div><div>KG</div><div>REPS</div><div>✔</div>';
        card.appendChild(headerRow);

        (ej.series || []).forEach((s, idx) => {
            const row = crearElemento('div', { class: 'set-row' });
            const colIndex = crearElemento('div', {}, String(idx + 1));
            const colAnterior = crearElemento('div', { class: 'muted' }, '-');
            const inputKg = crearElemento('input', { type: 'number', value: s.kg });
            inputKg.oninput = (ev) => actualizarSerie(rutina.id, ej.id, idx, 'kg', ev.target.value);
            const inputReps = crearElemento('input', { type: 'number', value: s.reps });
            inputReps.oninput = (ev) => actualizarSerie(rutina.id, ej.id, idx, 'reps', ev.target.value);
            const chk = crearElemento('input', { type: 'checkbox' }); chk.checked = s.completado; chk.onchange = (ev) => actualizarSerie(rutina.id, ej.id, idx, 'completado', ev.target.checked);
            const kgWrap = crearElemento('div'); kgWrap.appendChild(inputKg);
            const repsWrap = crearElemento('div'); repsWrap.appendChild(inputReps);
            const checkWrap = crearElemento('div'); checkWrap.appendChild(chk);
            row.appendChild(colIndex); row.appendChild(colAnterior); row.appendChild(kgWrap); row.appendChild(repsWrap); row.appendChild(checkWrap);
            card.appendChild(row);
        });

        const addSetFull = crearElemento('button', { class: 'btn-add-set add-exercise-btn' }, '+ Agregar Serie');
        addSetFull.onclick = () => agregarSerie(rutina.id, ej.id);
        card.appendChild(addSetFull);
        rc.appendChild(card);
    });

    contenedor.appendChild(rc);
}

// Eventos UI principales
// (La creación de rutinas se maneja desde la pantalla 'home' con el botón azul)

// Inicial render
guardarYRenderizar();

// --- CHATBOT UI ---
const chatInput = document.getElementById("chatInput");
const chatSend = document.getElementById("chatSend");
const chatMessages = document.getElementById("chatMessages");
const chatBubble = document.getElementById("chatBubble");
const chatPanel = document.getElementById("chatbot");
const chatClose = document.getElementById("chatClose");

function agregarMensaje(texto, autor = "bot") {
    const p = document.createElement("p");
    p.innerHTML = autor === "user"
        ? `<b>Tú:</b> ${texto}`
        : `<b>CoachBot:</b> ${texto}`;
    chatMessages.appendChild(p);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Toggle panel when clicking bubble
    if (chatBubble) chatBubble.addEventListener('click', () => {
        if (!chatPanel) return;
        chatPanel.classList.toggle('hidden');
    });

    if (chatClose) chatClose.addEventListener('click', () => {
        if (!chatPanel) return;
        chatPanel.classList.add('hidden');
    });

        chatSend.addEventListener("click", async () => {
        const mensaje = chatInput.value.trim();
        if (!mensaje) return;

        agregarMensaje(mensaje, "user");
        chatInput.value = "";

        agregarMensaje("Pensando...", "bot");

        try {
                const respuesta = await preguntarAlBot(mensaje);
                // Eliminar "Pensando..."
                if (chatMessages.lastChild) chatMessages.lastChild.remove();
                agregarMensaje(respuesta, "bot");
            } catch (error) {
                console.error("Error al obtener respuesta:", error);
                // Eliminar "Pensando..."
                if (chatMessages.lastChild) chatMessages.lastChild.remove();
                agregarMensaje(`Error: No se pudo conectar con el bot. ${error.message}`, "bot");
            }
    });

    // Enviar con Enter
    chatInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") chatSend.click();
});
