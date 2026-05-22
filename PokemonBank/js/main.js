/* ========================================================
   POKÉMON BANK - MAIN.JS
   ========================================================
   Archivo depurado, ordenado y comentado.

   Este archivo controla:
   1. Configuración general.
   2. Funciones auxiliares.
   3. Login tipo cajero.
   4. Sesión del usuario.
   5. Operaciones bancarias.
   6. Comprobantes PDF.
   7. Historial.
   8. Gráfico de transacciones.
   9. Eventos iniciales.

   Nota:
   El proyecto usa localStorage para guardar temporalmente:
   - Usuario.
   - Cuenta.
   - Saldo.
   - Historial de transacciones.
   ======================================================== */


/* ========================================================
   1. CONFIGURACIÓN GENERAL
   ======================================================== */

/* Nombre único con el que se guardan los datos en localStorage. */
const STORAGE_KEY = "usuarioPokemonBank";

/* Cantidad máxima de dígitos permitidos en los montos. */
const LIMITE_DIGITOS_MONTO = 10;

/* Usuario inicial de prueba para entrar al cajero. */
const usuarioBase = {
  nombre: "Ash Ketchum",
  cuenta: "0987654321",
  pin: "1234",
  saldo: 500,
  historial: []
};

/* Fondos del login según la hora del día.
   Las horas están convertidas a minutos desde las 00:00. */
const FONDOS_POR_HORARIO = [
  { desde: 0, hasta: 300, clase: "fondo-madrugada" },
  { desde: 300, hasta: 420, clase: "fondo-amanecer" },
  { desde: 420, hasta: 600, clase: "fondo-manana" },
  { desde: 600, hasta: 780, clase: "fondo-mediodia" },
  { desde: 780, hasta: 1020, clase: "fondo-tarde" },
  { desde: 1020, hasta: 1110, clase: "fondo-atardecer" },
  { desde: 1110, hasta: 1170, clase: "fondo-anochecer" },
  { desde: 1170, hasta: 1440, clase: "fondo-noche" }
];

/* Configuración de modales tipo cajero.
   Esto evita repetir el mismo código para depósito, retiro y servicios. */
const CONFIG_MODAL_OPERACION = {
  deposito: {
    tituloPregunta: "¿Desea cancelar el depósito?",
    textoPregunta: "Se borrará el monto ingresado y se cerrará el modal.",
    tituloFinal: "Depósito cancelado",
    textoFinal: "El depósito fue cancelado correctamente.",
    idInput: "montoDeposito",
    idFormulario: "formDepositar",
    idModal: "#modalDepositar"
  },
  retiro: {
    tituloPregunta: "¿Desea cancelar el retiro?",
    textoPregunta: "Se borrará el monto ingresado y se cerrará el modal.",
    tituloFinal: "Retiro cancelado",
    textoFinal: "El retiro fue cancelado correctamente.",
    idInput: "montoRetiro",
    idFormulario: "formRetirar",
    idModal: "#modalRetirar"
  },
  servicio: {
    tituloPregunta: "¿Desea cancelar el pago de servicios?",
    textoPregunta: "Se borrará el servicio seleccionado, el monto ingresado y se cerrará el modal.",
    tituloFinal: "Pago cancelado",
    textoFinal: "El pago de servicios fue cancelado correctamente.",
    idInput: "montoServicio",
    idFormulario: "formPagoServicio",
    idModal: "#modalPagoServicio"
  }
};

/* Categorías que se muestran en el gráfico.
   Cada categoría indica el texto exacto de la transacción y sus colores. */
const CATEGORIAS_GRAFICO = [
  {
    clave: "depositos",
    label: "Depósitos",
    tipo: "Depósito",
    backgroundColor: "#ffcc33",
    borderColor: "#d9a800"
  },
  {
    clave: "retiros",
    label: "Retiros",
    tipo: "Retiro",
    backgroundColor: "#ffa832",
    borderColor: "#c96a16"
  },
  {
    clave: "agua",
    label: "Agua potable",
    tipo: "Pago de servicio - Agua potable",
    backgroundColor: "#0dcaf0",
    borderColor: "#0aa2c0"
  },
  {
    clave: "energia",
    label: "Energía eléctrica",
    tipo: "Pago de servicio - Energía eléctrica",
    backgroundColor: "#54E346",
    borderColor: "#36b82f"
  },
  {
    clave: "internet",
    label: "Internet",
    tipo: "Pago de servicio - Internet",
    backgroundColor: "#F93827",
    borderColor: "#d94b4b"
  },
  {
    clave: "telefonia",
    label: "Telefonía",
    tipo: "Pago de servicio - Telefonía",
    backgroundColor: "#476EAE",
    borderColor: "#34558c"
  }
];

/* Colores usados en los PDF.
   Están centralizados para no repetir arrays de colores en varias funciones. */
const COLORES_PDF = {
  negro: [0, 0, 0],
  blanco: [255, 255, 255],

  azulCabecera: [30, 60, 122],
  azulPalido: [220, 235, 248],

  verdePalido: [226, 245, 233],
  rojoPalido: [252, 230, 230],
  naranjaSuave: [242, 203, 175],

  verdeTexto: [25, 135, 84],
  rojoTexto: [220, 53, 69]
};


/* ========================================================
   2. FUNCIONES AUXILIARES
   ======================================================== */

/* Atajo para no repetir document.getElementById en todo el archivo. */
function obtenerElemento(id) {
  return document.getElementById(id);
}

/* Verifica si jQuery existe y si el selector está presente en la página. */
function existeJQuery(selector) {
  return Boolean(window.jQuery && $(selector).length);
}

/* Agrega un número al input de monto usado por el keypad visual. */
function agregarMonto(idInput, numero) {
  const input = obtenerElemento(idInput);

  if (!input) return;

  /* Evita montos exageradamente largos. */
  if (input.value.length >= LIMITE_DIGITOS_MONTO) return;

  input.value += numero;
}

/* Limpia un input de monto. */
function limpiarMonto(idInput) {
  const input = obtenerElemento(idInput);

  if (input) {
    input.value = "";
  }
}

/* Limpia el formulario completo de pago de servicios. */
function limpiarPagoServicio() {
  const formulario = obtenerElemento("formPagoServicio");

  if (formulario) {
    formulario.reset();
  }

  limpiarMonto("montoServicio");
}

/* Valida el monto ingresado y lo deja con 2 decimales.
   Si el monto no es válido, limpia el input y devuelve NaN. */
function formatearMontoInput(idInput) {
  const input = obtenerElemento(idInput);

  if (!input) return NaN;

  const monto = Number(input.value);

  if (isNaN(monto) || monto <= 0) {
    input.value = "";
    return NaN;
  }

  input.value = monto.toFixed(2);
  return monto;
}

/* Devuelve fecha y hora actual en formato local. */
function obtenerFechaHoraActual() {
  const ahora = new Date();

  return {
    fecha: ahora.toLocaleDateString("es-SV"),
    hora: ahora.toLocaleTimeString("es-SV", {
      hour: "2-digit",
      minute: "2-digit"
    })
  };
}

/* Lee el usuario desde localStorage.
   Si el JSON está dañado, lo elimina para evitar errores. */
function obtenerUsuario() {
  const datosGuardados = localStorage.getItem(STORAGE_KEY);

  if (!datosGuardados) return null;

  try {
    const usuario = JSON.parse(datosGuardados);

    usuario.saldo = Number(usuario.saldo) || 0;

    if (!Array.isArray(usuario.historial)) {
      usuario.historial = [];
    }

    return usuario;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/* Guarda el usuario actualizado en localStorage. */
function guardarUsuario(usuarioActualizado) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarioActualizado));
}

/* Redirige al login si una página protegida se abre sin sesión. */
function redirigirSiNoHaySesion() {
  const paginaProtegida =
    obtenerElemento("nombreUsuario") ||
    obtenerElemento("numeroCuenta") ||
    obtenerElemento("tablaHistorial") ||
    obtenerElemento("graficoTransacciones");

  if (paginaProtegida && !obtenerUsuario()) {
    window.location.href = "index.html";
  }
}

/* Limpia un formulario y cierra un modal Bootstrap. */
function limpiarYCerrarModal(idFormulario, idModal) {
  const formulario = obtenerElemento(idFormulario);

  if (formulario) {
    formulario.reset();
  }

  if (existeJQuery(idModal)) {
    $(idModal).modal("hide");
  }
}

/* Registra una transacción en el historial del usuario. */
function registrarMovimiento(usuario, tipo, monto) {
  const fechaHora = obtenerFechaHoraActual();

  const transaccion = {
    tipo: tipo,
    monto: monto,
    fecha: fechaHora.fecha,
    hora: fechaHora.hora,
    saldoFinal: usuario.saldo
  };

  usuario.historial.push(transaccion);

  return transaccion;
}

/* Detecta si una transacción representa salida de dinero. */
function esTransaccionSalida(tipo) {
  return tipo === "Retiro" || tipo.startsWith("Pago de servicio");
}

/* Confirmación general antes de modificar saldo. */
function confirmarOperacion() {
  return swal({
    title: "¿Está seguro de querer realizar esta operación?",
    text: 'Una vez presionado "Aceptar" no podrá revertir esta operación.',
    icon: "warning",
    buttons: {
      confirm: {
        text: "Aceptar",
        value: true,
        visible: true
      },
      cancel: {
        text: "Cancelar",
        value: false,
        visible: true
      }
    },
    dangerMode: true
  });
}

/* Muestra alerta de éxito y luego pregunta si desea generar comprobante. */
function finalizarOperacionConComprobante(titulo, mensaje, transaccion, usuario) {
  swal(titulo, mensaje, "success").then(() => {
    preguntarComprobante({
      tipo: transaccion.tipo,
      monto: transaccion.monto,
      fecha: transaccion.fecha,
      hora: transaccion.hora,
      saldoFinal: transaccion.saldoFinal,
      nombreUsuario: usuario.nombre,
      cuenta: usuario.cuenta
    });
  });
}


/* ========================================================
   3. LOGIN TIPO CAJERO
   ======================================================== */

/* Agrega un número al PIN. Solo permite 4 dígitos. */
function agregarNumero(numero) {
  const pinInput = obtenerElemento("pin");

  if (pinInput && pinInput.value.length < 4) {
    pinInput.value += numero;
  }
}

/* Limpia el PIN ingresado. */
function limpiarPin() {
  const pinInput = obtenerElemento("pin");

  if (pinInput) {
    pinInput.value = "";
  }
}

/* Cancela el intento de inicio de sesión. */
function cancelarOperacion() {
  limpiarPin();

  swal({
    title: "Inicio cancelado",
    text: "Se canceló el intento de ingreso al cajero automático.",
    icon: "error",
    button: "Aceptar"
  });
}

/* Cambia el fondo del login según la hora actual. */
function cambiarFondoPorHorario() {
  const contenedor = document.querySelector(".atm-page");

  if (!contenedor) return;

  const ahora = new Date();
  const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();

  const clasesFondo = FONDOS_POR_HORARIO.map((fondo) => fondo.clase);

  contenedor.classList.remove(...clasesFondo);

  const fondoActual = FONDOS_POR_HORARIO.find((fondo) => {
    return minutosActuales >= fondo.desde && minutosActuales < fondo.hasta;
  });

  if (fondoActual) {
    contenedor.classList.add(fondoActual.clase);
  }
}

/* Valida el PIN y permite entrar a la pantalla de acciones. */
function iniciarSesion() {
  const pinInput = obtenerElemento("pin");

  if (!pinInput) return;

  const pinIngresado = pinInput.value.trim();

  if (pinIngresado === usuarioBase.pin) {
    /* Crea usuario solo si todavía no existe uno guardado. */
    if (!obtenerUsuario()) {
      guardarUsuario({
        ...usuarioBase,
        historial: []
      });
    }

    swal({
      title: "Bienvenido",
      text: "Acceso concedido a Pokémon Bank",
      icon: "success",
      button: "Continuar"
    }).then(() => {
      window.location.href = "acciones.html";
    });

    return;
  }

  swal({
    title: "PIN incorrecto",
    text: "Verifica tus datos e intenta nuevamente.",
    icon: "error",
    button: "Aceptar"
  }).then(() => {
    pinInput.value = "";
  });
}


/* ========================================================
   4. SESIÓN DEL USUARIO
   ======================================================== */

/* Carga nombre y número de cuenta en acciones.html. */
function cargarDatosUsuario() {
  const usuario = obtenerUsuario();
  const nombreUsuario = obtenerElemento("nombreUsuario");
  const numeroCuenta = obtenerElemento("numeroCuenta");

  if (nombreUsuario && usuario) {
    nombreUsuario.textContent = usuario.nombre;
  }

  if (numeroCuenta && usuario) {
    numeroCuenta.textContent = usuario.cuenta;
  }
}

/* Cierra sesión y elimina los datos guardados. */
function cerrarSesion() {
  if (document.activeElement) {
    document.activeElement.blur();
  }

  swal({
    title: "¿Está seguro de cerrar sesión?",
    text: "Se cerrará la sesión actual de Pokémon Bank.",
    icon: "warning",
    buttons: {
      confirm: {
        text: "Aceptar",
        value: true,
        visible: true
      },
      cancel: {
        text: "Cancelar",
        value: false,
        visible: true
      }
    },
    dangerMode: true
  }).then((confirmado) => {
    if (!confirmado) return;

    localStorage.removeItem(STORAGE_KEY);
    window.location.href = "index.html";
  });
}


/* ========================================================
   5. OPERACIONES BANCARIAS
   ======================================================== */

/* Procesa un depósito. */
function procesarDeposito() {
  const usuario = obtenerUsuario();
  const monto = formatearMontoInput("montoDeposito");

  if (!usuario) return;

  if (isNaN(monto) || monto <= 0) {
    swal("Monto inválido", "Ingresa un monto válido para realizar el depósito.", "warning");
    return;
  }

  confirmarOperacion().then((confirmado) => {
    if (!confirmado) return;

    usuario.saldo += monto;

    const transaccion = registrarMovimiento(usuario, "Depósito", monto);

    guardarUsuario(usuario);
    limpiarYCerrarModal("formDepositar", "#modalDepositar");

    finalizarOperacionConComprobante(
      "Depósito realizado",
      "Se depositó $" + monto.toFixed(2) + " correctamente.",
      transaccion,
      usuario
    );
  });
}

/* Procesa un retiro. */
function procesarRetiro() {
  const usuario = obtenerUsuario();
  const monto = formatearMontoInput("montoRetiro");

  if (!usuario) return;

  if (isNaN(monto) || monto <= 0) {
    swal("Monto inválido", "Ingresa un monto válido para realizar el retiro.", "warning");
    return;
  }

  if (monto > usuario.saldo) {
    swal("Fondos insuficientes", "No tienes saldo suficiente para realizar este retiro.", "error");
    return;
  }

  confirmarOperacion().then((confirmado) => {
    if (!confirmado) return;

    usuario.saldo -= monto;

    const transaccion = registrarMovimiento(usuario, "Retiro", monto);

    guardarUsuario(usuario);
    limpiarYCerrarModal("formRetirar", "#modalRetirar");

    finalizarOperacionConComprobante(
      "Retiro realizado",
      "Se retiró $" + monto.toFixed(2) + " correctamente.",
      transaccion,
      usuario
    );
  });
}

/* Muestra el saldo actual. */
function consultarSaldo() {
  const usuario = obtenerUsuario();

  if (!usuario) return;

  swal("Saldo actual", "$" + usuario.saldo.toFixed(2), "info");
}

/* Procesa el pago de servicios. */
function procesarPagoServicio() {
  const usuario = obtenerUsuario();
  const selectServicio = obtenerElemento("tipoServicio");
  const servicio = selectServicio ? selectServicio.value : "";
  const monto = formatearMontoInput("montoServicio");

  if (!usuario) return;

  if (!servicio || isNaN(monto) || monto <= 0) {
    swal("Datos inválidos", "Selecciona un servicio e ingresa un monto válido.", "warning");
    return;
  }

  if (monto > usuario.saldo) {
    swal("Fondos insuficientes", "No tienes saldo suficiente para pagar este servicio.", "error");
    return;
  }

  confirmarOperacion().then((confirmado) => {
    if (!confirmado) return;

    usuario.saldo -= monto;

    const transaccion = registrarMovimiento(
      usuario,
      "Pago de servicio - " + servicio,
      monto
    );

    guardarUsuario(usuario);
    limpiarYCerrarModal("formPagoServicio", "#modalPagoServicio");

    finalizarOperacionConComprobante(
      "Pago exitoso",
      "Se pagó " + servicio + " por $" + monto.toFixed(2) + ".",
      transaccion,
      usuario
    );
  });
}

/* Cancela depósito, retiro o pago de servicio desde el modal. */
function cancelarModalOperacion(tipoOperacion) {
  const configuracion = CONFIG_MODAL_OPERACION[tipoOperacion];

  if (!configuracion) return;

  swal({
    title: configuracion.tituloPregunta,
    text: configuracion.textoPregunta,
    icon: "warning",
    buttons: {
      confirm: {
        text: "Aceptar",
        value: true,
        visible: true
      },
      cancel: {
        text: "Cancelar",
        value: false,
        visible: true
      }
    },
    dangerMode: true
  }).then((confirmado) => {
    if (!confirmado) return;

    limpiarMonto(configuracion.idInput);
    limpiarYCerrarModal(configuracion.idFormulario, configuracion.idModal);

    setTimeout(() => {
      swal({
        title: configuracion.tituloFinal,
        text: configuracion.textoFinal,
        icon: "error",
        button: "Aceptar"
      });
    }, 250);
  });
}


/* ========================================================
   6. COMPROBANTES PDF
   ======================================================== */

/* Convierte una imagen local a base64 para poder insertarla en jsPDF. */
function cargarImagenComoBase64(rutaImagen) {
  return new Promise((resolve, reject) => {
    const imagen = new Image();

    imagen.crossOrigin = "anonymous";

    imagen.onload = () => {
      const canvas = document.createElement("canvas");
      const contexto = canvas.getContext("2d");

      canvas.width = imagen.width;
      canvas.height = imagen.height;

      contexto.drawImage(imagen, 0, 0);

      resolve(canvas.toDataURL("image/jpeg"));
    };

    imagen.onerror = () => reject("No se pudo cargar la imagen.");
    imagen.src = rutaImagen;
  });
}

/* Verifica si jsPDF está disponible antes de generar un PDF. */
function obtenerConstructorPDF() {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    swal(
      "Error",
      "No se pudo cargar jsPDF. Verifica que la librería esté agregada antes de main.js.",
      "error"
    );

    return null;
  }

  return window.jspdf.jsPDF;
}

/* Dibuja una celda reutilizable dentro de un PDF. */
function dibujarCeldaPDF(doc, x, y, ancho, alto, texto, opciones = {}) {
  const {
    relleno = COLORES_PDF.blanco,
    negrita = false,
    colorTexto = COLORES_PDF.negro,
    alineacion = "center",
    fontSize = 10,
    maxTextWidth = ancho - 6,
    lineHeight = 4
  } = opciones;

  doc.setDrawColor(...COLORES_PDF.negro);
  doc.setLineWidth(0.3);
  doc.setFillColor(...relleno);
  doc.rect(x, y, ancho, alto, "FD");

  doc.setFont("helvetica", negrita ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...colorTexto);

  let textoX = x + ancho / 2;

  if (alineacion === "left") {
    textoX = x + 3;
  }

  if (alineacion === "right") {
    textoX = x + ancho - 3;
  }

  const lineasTexto = doc.splitTextToSize(String(texto), maxTextWidth);

  const textoY =
    y +
    alto / 2 -
    ((lineasTexto.length - 1) * lineHeight) / 2 +
    1.5;

  doc.text(lineasTexto, textoX, textoY, {
    align: alineacion,
    lineHeightFactor: 1.1
  });
}

/* Devuelve colores de una transacción para usar en los PDF. */
function obtenerEstiloTransaccionPDF(tipo) {
  const esDeposito = tipo === "Depósito";
  const esSalida = esTransaccionSalida(tipo);

  if (esDeposito) {
    return {
      fondoFila: COLORES_PDF.verdePalido,
      colorTipo: COLORES_PDF.verdeTexto,
      colorMonto: COLORES_PDF.verdeTexto,
      textoNegrita: true
    };
  }

  if (esSalida) {
    return {
      fondoFila: COLORES_PDF.rojoPalido,
      colorTipo: COLORES_PDF.rojoTexto,
      colorMonto: COLORES_PDF.rojoTexto,
      textoNegrita: true
    };
  }

  return {
    fondoFila: COLORES_PDF.blanco,
    colorTipo: COLORES_PDF.negro,
    colorMonto: COLORES_PDF.negro,
    textoNegrita: false
  };
}

/* Pregunta si se desea generar comprobante PDF. */
function preguntarComprobante(datosComprobante) {
  swal({
    title: "¿Desea generar comprobante?",
    text: "Puede descargar el comprobante PDF de este " + datosComprobante.tipo.toLowerCase() + ".",
    icon: "info",
    buttons: {
      confirm: {
        text: "Sí, generar",
        value: true,
        visible: true,
        className: "btn-generar-pdf"
      },
      cancel: {
        text: "No",
        value: false,
        visible: true
      }
    }
  }).then((quiereComprobante) => {
    if (quiereComprobante) {
      generarComprobantePDF(datosComprobante);
    }
  });
}

/* Genera PDF de una sola transacción. */
async function generarComprobantePDF(datosComprobante) {
  const jsPDF = obtenerConstructorPDF();

  if (!jsPDF) return;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const fechaHoraActual = obtenerFechaHoraActual();

  const fecha = datosComprobante.fecha || fechaHoraActual.fecha;
  const hora = datosComprobante.hora || fechaHoraActual.hora;

  const tablaX = 20;
  const tablaY = 105;

  const colNumero = 16;
  const colTipo = 62;
  const colMonto = 32;
  const colFecha = 36;
  const colHora = 24;

  const tablaAncho = colNumero + colTipo + colMonto + colFecha + colHora;

  const altoHeader = 10;
  const altoFila = 10;
  const altoSaldo = 10;

  const xNumero = tablaX;
  const xTipo = xNumero + colNumero;
  const xMonto = xTipo + colTipo;
  const xFecha = xMonto + colMonto;
  const xHora = xFecha + colFecha;

  doc.setFillColor(...COLORES_PDF.blanco);
  doc.rect(0, 0, 210, 297, "F");

  /* Logo del PDF. */
  try {
    const logoBase64 = await cargarImagenComoBase64("images/PKBPDF.png");
    doc.addImage(logoBase64, "JPEG", 67, 14, 76, 18);
  } catch (error) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...COLORES_PDF.negro);
    doc.text("Pokémon Bank", 105, 30, { align: "center" });
  }

  /* Título del comprobante. */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(25);
  doc.setTextColor(...COLORES_PDF.rojoTexto);
  doc.text("COMPROBANTE DE TRANSACCIÓN", 105, 59, { align: "center" });

  /* Fila superior de usuario y cuenta. */
  const datosY = 72;
  const datosAlto = 10;

  const usuarioLabelW = 30;
  const usuarioValueW = 76;
  const cuentaLabelW = 30;
  const cuentaValueW = tablaAncho - usuarioLabelW - usuarioValueW - cuentaLabelW;

  dibujarCeldaPDF(doc, tablaX, datosY, usuarioLabelW, datosAlto, "Usuario:", {
    relleno: COLORES_PDF.naranjaSuave,
    negrita: true,
    alineacion: "left"
  });

  dibujarCeldaPDF(doc, tablaX + usuarioLabelW, datosY, usuarioValueW, datosAlto, datosComprobante.nombreUsuario, {
    relleno: COLORES_PDF.blanco
  });

  dibujarCeldaPDF(doc, tablaX + usuarioLabelW + usuarioValueW, datosY, cuentaLabelW, datosAlto, "Cuenta:", {
    relleno: COLORES_PDF.naranjaSuave,
    negrita: true,
    alineacion: "left"
  });

  dibujarCeldaPDF(
    doc,
    tablaX + usuarioLabelW + usuarioValueW + cuentaLabelW,
    datosY,
    cuentaValueW,
    datosAlto,
    datosComprobante.cuenta,
    {
      relleno: COLORES_PDF.blanco
    }
  );

  /* Encabezado de tabla. */
  dibujarCeldaPDF(doc, xNumero, tablaY, colNumero, altoHeader, "#", {
    relleno: COLORES_PDF.azulCabecera,
    negrita: true,
    colorTexto: COLORES_PDF.blanco
  });

  dibujarCeldaPDF(doc, xTipo, tablaY, colTipo, altoHeader, "Tipo de transacción", {
    relleno: COLORES_PDF.azulCabecera,
    negrita: true,
    colorTexto: COLORES_PDF.blanco
  });

  dibujarCeldaPDF(doc, xMonto, tablaY, colMonto, altoHeader, "Monto", {
    relleno: COLORES_PDF.azulCabecera,
    negrita: true,
    colorTexto: COLORES_PDF.blanco
  });

  dibujarCeldaPDF(doc, xFecha, tablaY, colFecha, altoHeader, "Fecha", {
    relleno: COLORES_PDF.azulCabecera,
    negrita: true,
    colorTexto: COLORES_PDF.blanco
  });

  dibujarCeldaPDF(doc, xHora, tablaY, colHora, altoHeader, "Hora", {
    relleno: COLORES_PDF.azulCabecera,
    negrita: true,
    colorTexto: COLORES_PDF.blanco
  });

  const estilo = obtenerEstiloTransaccionPDF(datosComprobante.tipo);
  const filaY = tablaY + altoHeader;

  /* Fila de transacción. */
  dibujarCeldaPDF(doc, xNumero, filaY, colNumero, altoFila, "1", {
    relleno: estilo.fondoFila
  });

  dibujarCeldaPDF(doc, xTipo, filaY, colTipo, altoFila, datosComprobante.tipo, {
    relleno: estilo.fondoFila,
    negrita: estilo.textoNegrita,
    colorTexto: estilo.colorTipo,
    fontSize: 9,
    maxTextWidth: colTipo - 8
  });

  dibujarCeldaPDF(doc, xMonto, filaY, colMonto, altoFila, "$" + datosComprobante.monto.toFixed(2), {
    relleno: estilo.fondoFila,
    negrita: estilo.textoNegrita,
    colorTexto: estilo.colorMonto
  });

  dibujarCeldaPDF(doc, xFecha, filaY, colFecha, altoFila, fecha, {
    relleno: estilo.fondoFila
  });

  dibujarCeldaPDF(doc, xHora, filaY, colHora, altoFila, hora, {
    relleno: estilo.fondoFila
  });

  /* Fila de saldo actual. */
  const saldoY = filaY + altoFila;

  dibujarCeldaPDF(doc, tablaX, saldoY, colNumero + colTipo, altoSaldo, "Saldo actual:", {
    relleno: COLORES_PDF.azulCabecera,
    negrita: true,
    colorTexto: COLORES_PDF.blanco
  });

  dibujarCeldaPDF(
    doc,
    tablaX + colNumero + colTipo,
    saldoY,
    tablaAncho - colNumero - colTipo,
    altoSaldo,
    "$" + datosComprobante.saldoFinal.toFixed(2),
    {
      relleno: COLORES_PDF.azulPalido,
      negrita: true
    }
  );

  const tipoArchivo = datosComprobante.tipo
    .toLowerCase()
    .replace(/\s+/g, "-");

  const fechaArchivo = new Date().toISOString().slice(0, 10);

  doc.save(`comprobante-${tipoArchivo}-${fechaArchivo}.pdf`);
}

/* Imprime la última transacción registrada. */
function imprimirTransaccionReciente() {
  const usuario = obtenerUsuario();

  if (!usuario || usuario.historial.length === 0) {
    swal(
      "Historial vacío",
      "No hay transacciones recientes para imprimir.",
      "warning"
    );
    return;
  }

  const ultimaTransaccion = usuario.historial[usuario.historial.length - 1];

  swal({
    title: "¿Desea imprimir la transacción reciente?",
    text: "Se generará el comprobante PDF de la última transacción realizada.",
    icon: "info",
    buttons: {
      confirm: {
        text: "Sí, imprimir",
        value: true,
        visible: true,
        className: "btn-generar-pdf"
      },
      cancel: {
        text: "Cancelar",
        value: false,
        visible: true
      }
    }
  }).then((confirmado) => {
    if (!confirmado) return;

    generarComprobantePDF({
      tipo: ultimaTransaccion.tipo,
      monto: Number(ultimaTransaccion.monto),
      fecha: ultimaTransaccion.fecha,
      hora: ultimaTransaccion.hora,
      saldoFinal: Number(ultimaTransaccion.saldoFinal),
      nombreUsuario: usuario.nombre,
      cuenta: usuario.cuenta
    });
  });
}

/* Captura el gráfico actual como imagen para insertarlo en PDF. */
function obtenerImagenGraficoPDF() {
  const canvas = obtenerElemento("graficoTransacciones");

  if (!canvas) return null;

  return canvas.toDataURL("image/png", 1.0);
}

/* Pregunta si se desea imprimir todo el historial. */
function imprimirHistorialCompleto() {
  const usuario = obtenerUsuario();

  if (!usuario || usuario.historial.length === 0) {
    swal(
      "Historial vacío",
      "No hay transacciones registradas para imprimir.",
      "warning"
    );
    return;
  }

  swal({
    title: "¿Desea imprimir el historial completo?",
    text: "Se generará un PDF con todas las transacciones realizadas.",
    icon: "info",
    buttons: {
      confirm: {
        text: "Sí, imprimir",
        value: true,
        visible: true,
        className: "btn-generar-pdf"
      },
      cancel: {
        text: "Cancelar",
        value: false,
        visible: true
      }
    }
  }).then((confirmado) => {
    if (!confirmado) return;

    generarHistorialPDF(usuario);
  });
}

/* Pregunta si se desea generar reporte de historial + gráfico. */
function preguntarReporteGraficoPDF() {
  const usuario = obtenerUsuario();
  const grafico = obtenerElemento("graficoTransacciones");

  if (!usuario || usuario.historial.length === 0) {
    swal(
      "Historial vacío",
      "No hay transacciones registradas para generar el reporte.",
      "warning"
    );
    return;
  }

  if (!grafico) {
    swal(
      "Gráfico no disponible",
      "No se encontró el gráfico para agregarlo al reporte.",
      "warning"
    );
    return;
  }

  swal({
    title: "¿Desea generar el reporte?",
    text: "Se generará un PDF con el historial completo y el gráfico.",
    icon: "info",
    buttons: {
      confirm: {
        text: "Sí, generar",
        value: true,
        visible: true,
        className: "btn-generar-pdf"
      },
      cancel: {
        text: "Cancelar",
        value: false,
        visible: true
      }
    }
  }).then((confirmado) => {
    if (!confirmado) return;

    generarHistorialPDF(usuario, {
      incluirGrafico: true
    });
  });
}

/* Genera el PDF del historial completo.
   También puede incluir una página extra con el gráfico. */
async function generarHistorialPDF(usuario, opciones = {}) {
  const { incluirGrafico = false } = opciones;
  const jsPDF = obtenerConstructorPDF();

  if (!jsPDF) return;

  const imagenGrafico = incluirGrafico ? obtenerImagenGraficoPDF() : null;

  const tituloDocumento = incluirGrafico
    ? "REPORTE DE TRANSACCIONES"
    : "HISTORIAL DE TRANSACCIONES";

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const tablaX = 15;
  const tablaYInicial = 95;

  const colNumero = 14;
  const colTipo = 66;
  const colMonto = 32;
  const colFecha = 42;
  const colHora = 26;

  const altoHeader = 10;
  const altoFila = 10;

  const xNumero = tablaX;
  const xTipo = xNumero + colNumero;
  const xMonto = xTipo + colTipo;
  const xFecha = xMonto + colMonto;
  const xHora = xFecha + colFecha;

  async function dibujarEncabezadoDocumento() {
    doc.setFillColor(...COLORES_PDF.blanco);
    doc.rect(0, 0, 210, 297, "F");

    try {
      const logoBase64 = await cargarImagenComoBase64("images/PKBPDF.png");
      doc.addImage(logoBase64, "JPEG", 67, 14, 76, 18);
    } catch (error) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(...COLORES_PDF.negro);
      doc.text("Pokémon Bank", 105, 30, { align: "center" });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(23);
    doc.setTextColor(...COLORES_PDF.rojoTexto);
    doc.text(tituloDocumento, 105, 55, { align: "center" });

    /* Datos de usuario y cuenta. */
    dibujarCeldaPDF(doc, tablaX, 70, 30, 10, "Usuario:", {
      relleno: COLORES_PDF.naranjaSuave,
      negrita: true,
      alineacion: "left"
    });

    dibujarCeldaPDF(doc, tablaX + 30, 70, 65, 10, usuario.nombre, {
      relleno: COLORES_PDF.blanco
    });

    dibujarCeldaPDF(doc, tablaX + 95, 70, 30, 10, "Cuenta:", {
      relleno: COLORES_PDF.naranjaSuave,
      negrita: true,
      alineacion: "left"
    });

    dibujarCeldaPDF(doc, tablaX + 125, 70, 55, 10, usuario.cuenta, {
      relleno: COLORES_PDF.blanco
    });
  }

  function dibujarCabeceraTabla(y) {
    dibujarCeldaPDF(doc, xNumero, y, colNumero, altoHeader, "#", {
      relleno: COLORES_PDF.azulCabecera,
      negrita: true,
      colorTexto: COLORES_PDF.blanco
    });

    dibujarCeldaPDF(doc, xTipo, y, colTipo, altoHeader, "Tipo de transacción", {
      relleno: COLORES_PDF.azulCabecera,
      negrita: true,
      colorTexto: COLORES_PDF.blanco
    });

    dibujarCeldaPDF(doc, xMonto, y, colMonto, altoHeader, "Monto", {
      relleno: COLORES_PDF.azulCabecera,
      negrita: true,
      colorTexto: COLORES_PDF.blanco
    });

    dibujarCeldaPDF(doc, xFecha, y, colFecha, altoHeader, "Fecha", {
      relleno: COLORES_PDF.azulCabecera,
      negrita: true,
      colorTexto: COLORES_PDF.blanco
    });

    dibujarCeldaPDF(doc, xHora, y, colHora, altoHeader, "Hora", {
      relleno: COLORES_PDF.azulCabecera,
      negrita: true,
      colorTexto: COLORES_PDF.blanco
    });
  }

  await dibujarEncabezadoDocumento();

  let y = tablaYInicial;

  dibujarCabeceraTabla(y);
  y += altoHeader;

  usuario.historial.forEach((transaccion, index) => {
    /* Si la página ya no tiene espacio, se crea una nueva. */
    if (y > 270) {
      doc.addPage();
      y = 20;
      dibujarCabeceraTabla(y);
      y += altoHeader;
    }

    const estilo = obtenerEstiloTransaccionPDF(transaccion.tipo);

    dibujarCeldaPDF(doc, xNumero, y, colNumero, altoFila, index + 1, {
      relleno: estilo.fondoFila
    });

    dibujarCeldaPDF(doc, xTipo, y, colTipo, altoFila, transaccion.tipo, {
      relleno: estilo.fondoFila,
      negrita: estilo.textoNegrita,
      colorTexto: estilo.colorTipo,
      fontSize: 10,
      maxTextWidth: colTipo - 8
    });

    dibujarCeldaPDF(doc, xMonto, y, colMonto, altoFila, "$" + Number(transaccion.monto).toFixed(2), {
      relleno: estilo.fondoFila,
      negrita: estilo.textoNegrita,
      colorTexto: estilo.colorMonto
    });

    dibujarCeldaPDF(doc, xFecha, y, colFecha, altoFila, transaccion.fecha || "-", {
      relleno: estilo.fondoFila
    });

    dibujarCeldaPDF(doc, xHora, y, colHora, altoFila, transaccion.hora || "-", {
      relleno: estilo.fondoFila
    });

    y += altoFila;
  });

  /* Fila final de saldo actual. */
  if (y > 265) {
    doc.addPage();
    y = 20;
  }

  dibujarCeldaPDF(
    doc,
    tablaX,
    y,
    colNumero + colTipo + colMonto + colFecha,
    altoFila,
    "Saldo actual:",
    {
      relleno: COLORES_PDF.azulCabecera,
      negrita: true,
      colorTexto: COLORES_PDF.blanco
    }
  );

  dibujarCeldaPDF(
    doc,
    tablaX + colNumero + colTipo + colMonto + colFecha,
    y,
    colHora,
    altoFila,
    "$" + usuario.saldo.toFixed(2),
    {
      relleno: COLORES_PDF.azulCabecera,
      negrita: true,
      colorTexto: COLORES_PDF.blanco
    }
  );

  /* Página extra con el gráfico si se genera reporte. */
  if (incluirGrafico && imagenGrafico) {
    doc.addPage();

    doc.setFillColor(...COLORES_PDF.blanco);
    doc.rect(0, 0, 210, 297, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...COLORES_PDF.rojoTexto);
    doc.text("GRÁFICO DE TRANSACCIONES", 105, 32, { align: "center" });

    doc.addImage(imagenGrafico, "PNG", 15, 50, 180, 105);
  }

  const fechaArchivo = new Date().toISOString().slice(0, 10);

  const nombreArchivo = incluirGrafico
    ? `reporte-transacciones-${fechaArchivo}.pdf`
    : `historial-transacciones-${fechaArchivo}.pdf`;

  doc.save(nombreArchivo);
}


/* ========================================================
   7. HISTORIAL DE TRANSACCIONES
   ======================================================== */

/* Llena la tabla de historial en historial.html. */
function mostrarHistorial() {
  const tablaHistorial = obtenerElemento("tablaHistorial");
  const mensajeVacio = obtenerElemento("mensajeVacio");
  const usuario = obtenerUsuario();

  if (!tablaHistorial || !usuario) return;

  tablaHistorial.innerHTML = "";

  if (usuario.historial.length === 0) {
    if (mensajeVacio) {
      mensajeVacio.classList.remove("d-none");
    }

    return;
  }

  if (mensajeVacio) {
    mensajeVacio.classList.add("d-none");
  }

  usuario.historial.forEach((transaccion, index) => {
    const fila = document.createElement("tr");

    let claseFila = "";
    let claseTipo = "tipo-normal";
    let claseMonto = "";

    if (transaccion.tipo === "Depósito") {
      claseFila = "fila-deposito";
      claseTipo = "tipo-deposito";
      claseMonto = "monto-deposito";
    } else if (esTransaccionSalida(transaccion.tipo)) {
      claseFila = "fila-salida";
      claseTipo = "tipo-salida";
      claseMonto = "monto-salida";
    }

    if (claseFila) {
      fila.classList.add(claseFila);
    }

    fila.innerHTML = `
      <td>${index + 1}</td>
      <td class="${claseTipo}">${transaccion.tipo}</td>
      <td class="${claseMonto}">$${Number(transaccion.monto).toFixed(2)}</td>
      <td>${transaccion.fecha || "-"}</td>
      <td>${transaccion.hora || "-"}</td>
    `;

    tablaHistorial.appendChild(fila);
  });

  /* Fila final con saldo actual. */
  const filaSaldo = document.createElement("tr");

  filaSaldo.classList.add("fila-saldo-actual");

  filaSaldo.innerHTML = `
    <td colspan="4" class="saldo-label">Saldo actual:</td>
    <td class="saldo-monto">$${usuario.saldo.toFixed(2)}</td>
  `;

  tablaHistorial.appendChild(filaSaldo);
}


/* ========================================================
   8. GRÁFICO DE TRANSACCIONES
   ======================================================== */

/* Cuenta cuántas transacciones hay por categoría. */
function contarTransacciones(historial) {
  const totalesIniciales = CATEGORIAS_GRAFICO.reduce((totales, categoria) => {
    totales[categoria.clave] = 0;
    return totales;
  }, {});

  return historial.reduce((totales, transaccion) => {
    const categoria = CATEGORIAS_GRAFICO.find((item) => {
      return item.tipo === transaccion.tipo;
    });

    if (categoria) {
      totales[categoria.clave]++;
    }

    return totales;
  }, totalesIniciales);
}

/* Dibuja el gráfico de dona en grafico.html. */
function mostrarGrafico() {
  const canvas = obtenerElemento("graficoTransacciones");
  const usuario = obtenerUsuario();

  if (!canvas || !usuario || typeof Chart === "undefined") return;

  const totales = contarTransacciones(usuario.historial);

  const labels = [];
  const data = [];
  const backgroundColor = [];
  const borderColor = [];

  CATEGORIAS_GRAFICO.forEach((categoria) => {
    const total = totales[categoria.clave];

    if (total > 0) {
      labels.push(categoria.label);
      data.push(total);
      backgroundColor.push(categoria.backgroundColor);
      borderColor.push(categoria.borderColor);
    }
  });

  if (data.length === 0) return;

  const graficoTransacciones = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Cantidad de transacciones",
          data: data,
          backgroundColor: backgroundColor,
          borderColor: borderColor,
          borderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 22,
            boxWidth: 36,
            font: {
              size: 16
            }
          }
        }
      }
    }
  });

  window.addEventListener("resize", () => {
    graficoTransacciones.resize();
  });
}


/* ========================================================
   9. EVENTOS E INICIALIZACIÓN GENERAL
   ======================================================== */

/* Cambia la flecha visual del selector de servicios. */
function inicializarFlechaServicio() {
  const selectServicio = obtenerElemento("tipoServicio");

  if (!selectServicio) return;

  const cajaSelect = selectServicio.closest(".modal-service-screen");

  if (!cajaSelect) return;

  const abrirSelector = () => {
    cajaSelect.classList.add("select-open");
  };

  const cerrarSelector = () => {
    cajaSelect.classList.remove("select-open");
  };

  selectServicio.addEventListener("mousedown", () => {
    cajaSelect.classList.toggle("select-open");
  });

  selectServicio.addEventListener("change", cerrarSelector);
  selectServicio.addEventListener("blur", cerrarSelector);

  selectServicio.addEventListener("keydown", (event) => {
    const teclasParaAbrir = ["Enter", " ", "ArrowDown", "ArrowUp"];

    if (teclasParaAbrir.includes(event.key)) {
      abrirSelector();
    }

    if (event.key === "Escape" || event.key === "Tab") {
      cerrarSelector();
    }
  });

  if (existeJQuery("#modalPagoServicio")) {
    $("#modalPagoServicio").on("hidden.bs.modal", cerrarSelector);
  }
}

/* Inicializa eventos especiales de los modales. */
function inicializarEventosModales() {
  inicializarFlechaServicio();

  if (!window.jQuery) return;

  if ($("#modalPagoServicio").length) {
    $("#modalPagoServicio").on("shown.bs.modal", () => {
      $("#tipoServicio").trigger("focus");
    });
  }
}

/* Arranque general del proyecto.
   Cada función valida si su elemento existe, por eso este JS puede cargarse
   en varias páginas sin romperse. */
document.addEventListener("DOMContentLoaded", () => {
  cambiarFondoPorHorario();
  redirigirSiNoHaySesion();
  cargarDatosUsuario();
  mostrarHistorial();
  mostrarGrafico();
  inicializarEventosModales();
});
/* Fin main.js de Proyecto Fase 2 */