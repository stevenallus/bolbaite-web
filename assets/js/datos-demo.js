/* ============================================================
   GRUPO BOLBAITE — Intranet demo · Datos de demostración
   generarDatosDemo({ hoy, semilla }) crea un modelo completo y
   determinista (misma semilla + misma fecha = mismos datos), con
   fechas relativas a `hoy` para que la demo parezca siempre actual.
   Todos los nombres de clientes son inventados.
   ============================================================ */
(function (raiz) {
  'use strict';

  /* ---------- Catálogo fijo ---------- */

  const FAMILIAS = [
    { id: 'tela', nombre: 'Discos de tela', tipo: 'propia' },
    { id: 'sisal', nombre: 'Sisal', tipo: 'propia' },
    { id: 'franela', nombre: 'Franela', tipo: 'propia' },
    { id: 'malla', nombre: 'Malla abrasiva', tipo: 'propia' },
    { id: 'tejana', nombre: 'Tela tejana', tipo: 'propia' },
    { id: 'cuerda', nombre: 'Cuerda y esparto', tipo: 'propia' },
    { id: 'corte', nombre: 'ALBAIT corte', tipo: 'propia' },
    { id: 'laminas', nombre: 'ALBAIT láminas', tipo: 'propia' },
    { id: 'pastas', nombre: 'Pastas de pulido', tipo: 'propia' },
    { id: '3m', nombre: '3M', tipo: 'distribucion' },
    { id: 'sia', nombre: 'sia', tipo: 'distribucion' },
    { id: 'klingspor', nombre: 'Klingspor', tipo: 'distribucion' },
    { id: 'fein', nombre: 'Fein', tipo: 'distribucion' },
  ];

  // [id, nombre, unidad, coste por unidad, meses de stock respecto al consumo]
  const MATERIALES = [
    ['tela-algodon', 'Tela de algodón crudo', 'm²', 3.2, 3],
    ['tela-tejana', 'Tela tejana', 'm²', 4.5, 6],
    ['franela', 'Franela', 'm²', 3.8, 9],
    ['sisal', 'Sisal tejido', 'm²', 5.2, 1.4],
    ['malla', 'Malla abrasiva', 'm²', 9.5, 2],
    ['cuerda', 'Cuerda de sisal', 'm', 0.35, 4],
    ['esparto', 'Esparto', 'kg', 2.8, 5],
    ['hilo', 'Hilo de coser poliéster', 'm', 0.004, 5],
    ['grapas', 'Grapas metálicas', 'uds', 0.006, null], // stock fijo: 15.000
    ['centros-carton', 'Centros de cartón', 'uds', 0.08, 4],
    ['bujes', 'Bujes metálicos', 'uds', 0.35, 2.5],
    ['resina', 'Resina fenólica', 'kg', 4.2, 3],
    ['grano', 'Grano abrasivo', 'kg', 3.6, 3],
    ['fibra-vidrio', 'Malla de fibra de vidrio', 'uds', 0.07, 4],
    ['tela-zirconio', 'Tela abrasiva de zirconio', 'm²', 12, 2],
    ['cera', 'Cera / base de pasta', 'kg', 2.4, 4],
    ['etiquetas', 'Etiquetas', 'uds', 0.02, 6],
    ['cajas', 'Cajas de cartón', 'uds', 0.45, 3],
    ['envases', 'Envases', 'uds', 0.3, 4],
  ];
  const STOCK_GRAPAS = 15000;

  // [id, nombre, €/h máquina, operarios]
  const MAQUINAS = [
    ['cortadora-1', 'Cortadora 1', 14, 1],
    ['cortadora-2', 'Cortadora 2', 14, 1],
    ['cortadora-3', 'Cortadora 3 (CNC)', 19, 1],
    ['cosedora-1', 'Cosedora 1', 11, 1],
    ['cosedora-2', 'Cosedora 2', 12, 1],
    ['grapadora', 'Grapadora', 9, 1],
    ['prensa', 'Prensa hidráulica', 24, 2],
    ['horno', 'Horno de curado', 17, 0.5],
    ['mezcladora', 'Mezcladora de pastas', 13, 1],
    ['embalaje', 'Línea de embalaje', 8, 1],
  ];

  const EMB = (min = 0.05) => ['embalaje', 10, min];

  // Productos de fabricación propia.
  // base: uds/mes de un cliente medio · pack: múltiplo de pedido · cob: meses de stock objetivo
  // escandallo: { material: cantidad por unidad } · ruta: [máquina, min preparación, min/unidad]
  const PROPIOS = [
    { id: 'DT-150-12', nombre: 'Disco de tela algodón Ø150 × 12 mm', fam: 'tela', precio: 3.9, base: 60, pack: 5, int: [30, 45], cob: 4,
      esc: { 'tela-algodon': 0.11, hilo: 6, 'centros-carton': 1, etiquetas: 0.02, cajas: 0.02 },
      ruta: [['cortadora-1', 20, 0.2], ['cosedora-1', 15, 0.9], EMB()] },
    { id: 'DT-200-20', nombre: 'Disco de tela algodón Ø200 × 20 mm', fam: 'tela', precio: 6.5, base: 35, pack: 5, int: [30, 45, 60], cob: 5,
      esc: { 'tela-algodon': 0.32, hilo: 11, 'centros-carton': 1, etiquetas: 0.04, cajas: 0.04 },
      ruta: [['cortadora-1', 20, 0.3], ['cosedora-1', 15, 1.6], EMB(0.06)] },
    { id: 'DT-300-30', nombre: 'Disco de tela algodón Ø300 × 30 mm', fam: 'tela', precio: 14, base: 12, pack: 5, int: [45, 60], cob: 3.5,
      esc: { 'tela-algodon': 0.95, hilo: 22, bujes: 1, etiquetas: 0.1, cajas: 0.1 },
      ruta: [['cortadora-2', 25, 0.5], ['cosedora-2', 20, 3.2], EMB(0.1)] },
    { id: 'DS-200-G', nombre: 'Disco de sisal Ø200 grapado', fam: 'sisal', precio: 7.8, base: 50, pack: 5, int: [30, 45], cob: 0.6,
      esc: { sisal: 0.3, grapas: 24, bujes: 1, etiquetas: 0.04, cajas: 0.04 },
      ruta: [['cortadora-3', 20, 0.35], ['grapadora', 15, 0.8], EMB(0.06)] },
    { id: 'DS-250-G', nombre: 'Disco de sisal Ø250 grapado', fam: 'sisal', precio: 10.5, base: 25, pack: 5, int: [45, 60], cob: 0.8,
      esc: { sisal: 0.48, grapas: 30, bujes: 1, etiquetas: 0.05, cajas: 0.05 },
      ruta: [['cortadora-3', 20, 0.45], ['grapadora', 15, 1], EMB(0.07)] },
    { id: 'DS-150-C', nombre: 'Disco combinado sisal + tela Ø150', fam: 'sisal', precio: 5.9, base: 30, pack: 5, int: [30, 45], cob: 0.9,
      esc: { sisal: 0.1, 'tela-algodon': 0.06, grapas: 16, hilo: 4, 'centros-carton': 1, etiquetas: 0.02, cajas: 0.02 },
      ruta: [['cortadora-3', 20, 0.3], ['cosedora-2', 15, 0.7], ['grapadora', 10, 0.5], EMB()] },
    { id: 'DF-150-10', nombre: 'Disco de franela Ø150 × 10 mm', fam: 'franela', precio: 4.6, base: 6, pack: 5, int: [45, 60], cob: 30,
      esc: { franela: 0.1, hilo: 5, 'centros-carton': 1, etiquetas: 0.02, cajas: 0.02 },
      ruta: [['cortadora-1', 20, 0.2], ['cosedora-1', 15, 0.8], EMB()] },
    { id: 'DF-250-20', nombre: 'Disco de franela Ø250 × 20 mm', fam: 'franela', precio: 9.2, base: 3, pack: 5, int: [60, 90], cob: 32,
      esc: { franela: 0.36, hilo: 12, bujes: 1, etiquetas: 0.04, cajas: 0.04 },
      ruta: [['cortadora-2', 20, 0.35], ['cosedora-2', 15, 1.8], EMB(0.06)] },
    { id: 'MA-125', nombre: 'Disco de malla abrasiva Ø125', fam: 'malla', precio: 6.8, base: 40, pack: 10, int: [30, 45], cob: 1.5,
      esc: { malla: 0.03, 'fibra-vidrio': 1, resina: 0.004, etiquetas: 0.02, cajas: 0.02 },
      ruta: [['cortadora-3', 15, 0.15], ['prensa', 30, 0.25], EMB(0.04)] },
    { id: 'MA-200', nombre: 'Disco de malla abrasiva Ø200', fam: 'malla', precio: 11.5, base: 15, pack: 5, int: [45, 60], cob: 1.8,
      esc: { malla: 0.075, 'fibra-vidrio': 1, resina: 0.008, etiquetas: 0.04, cajas: 0.04 },
      ruta: [['cortadora-3', 15, 0.22], ['prensa', 30, 0.35], EMB()] },
    { id: 'TT-150', nombre: 'Disco de tela tejana Ø150', fam: 'tejana', precio: 4.9, base: 20, pack: 5, int: [30, 45], cob: 9,
      esc: { 'tela-tejana': 0.1, hilo: 6, 'centros-carton': 1, etiquetas: 0.02, cajas: 0.02 },
      ruta: [['cortadora-2', 20, 0.22], ['cosedora-1', 15, 1], EMB()] },
    { id: 'TT-250', nombre: 'Disco de tela tejana Ø250', fam: 'tejana', precio: 9.8, base: 8, pack: 5, int: [45, 60], cob: 11,
      esc: { 'tela-tejana': 0.34, hilo: 13, bujes: 1, etiquetas: 0.04, cajas: 0.04 },
      ruta: [['cortadora-2', 20, 0.38], ['cosedora-2', 15, 2], EMB(0.06)] },
    { id: 'CU-200', nombre: 'Disco de cuerda Ø200', fam: 'cuerda', precio: 8.5, base: 10, pack: 5, int: [45, 60], cob: 5,
      esc: { cuerda: 14, hilo: 4, bujes: 1, etiquetas: 0.04, cajas: 0.04 },
      ruta: [['cosedora-2', 20, 2.2], EMB(0.06)] },
    { id: 'ES-200', nombre: 'Disco de esparto Ø200', fam: 'cuerda', precio: 7.9, base: 8, pack: 5, int: [45, 60], cob: 7,
      esc: { esparto: 0.35, grapas: 18, bujes: 1, etiquetas: 0.04, cajas: 0.04 },
      ruta: [['grapadora', 15, 1.2], EMB(0.06)] },
    { id: 'AC-125-10', nombre: 'Corte ALBAIT inox 125 × 1,0', fam: 'corte', precio: 0.95, base: 300, pack: 25, int: [21, 30, 45], cob: 3,
      esc: { grano: 0.018, resina: 0.006, 'fibra-vidrio': 2, etiquetas: 1, cajas: 0.04 },
      ruta: [['mezcladora', 30, 0.02], ['prensa', 40, 0.12], ['horno', 60, 0.03], EMB(0.02)] },
    { id: 'AC-115-10', nombre: 'Corte ALBAIT inox 115 × 1,0', fam: 'corte', precio: 0.85, base: 200, pack: 25, int: [21, 30, 45], cob: 2.5,
      esc: { grano: 0.015, resina: 0.005, 'fibra-vidrio': 2, etiquetas: 1, cajas: 0.04 },
      ruta: [['mezcladora', 30, 0.02], ['prensa', 40, 0.11], ['horno', 60, 0.03], EMB(0.02)] },
    { id: 'AC-230-19', nombre: 'Corte ALBAIT metal 230 × 1,9', fam: 'corte', precio: 2.4, base: 80, pack: 25, int: [30, 45], cob: 4,
      esc: { grano: 0.085, resina: 0.028, 'fibra-vidrio': 2, etiquetas: 1, cajas: 0.04 },
      ruta: [['mezcladora', 30, 0.05], ['prensa', 40, 0.25], ['horno', 60, 0.06], EMB(0.03)] },
    { id: 'AL-125-60', nombre: 'Láminas ALBAIT zirconio Ø125 G60', fam: 'laminas', precio: 2.1, base: 120, pack: 10, int: [30, 45], cob: 2.5,
      esc: { 'tela-zirconio': 0.045, 'fibra-vidrio': 1, resina: 0.01, etiquetas: 1, cajas: 0.1 },
      ruta: [['cortadora-3', 20, 0.1], ['prensa', 30, 0.4], ['horno', 60, 0.05], EMB(0.03)] },
    { id: 'AL-125-80', nombre: 'Láminas ALBAIT zirconio Ø125 G80', fam: 'laminas', precio: 2.1, base: 100, pack: 10, int: [30, 45], cob: 3.5,
      esc: { 'tela-zirconio': 0.045, 'fibra-vidrio': 1, resina: 0.01, etiquetas: 1, cajas: 0.1 },
      ruta: [['cortadora-3', 20, 0.1], ['prensa', 30, 0.4], ['horno', 60, 0.05], EMB(0.03)] },
    { id: 'AL-115-120', nombre: 'Láminas ALBAIT zirconio Ø115 G120', fam: 'laminas', precio: 1.9, base: 60, pack: 10, int: [30, 45, 60], cob: 6,
      esc: { 'tela-zirconio': 0.038, 'fibra-vidrio': 1, resina: 0.009, etiquetas: 1, cajas: 0.1 },
      ruta: [['cortadora-3', 20, 0.09], ['prensa', 30, 0.38], ['horno', 60, 0.05], EMB(0.03)] },
    { id: 'PS-BL', nombre: 'Pasta sólida blanca (barra 1 kg)', fam: 'pastas', precio: 9.5, base: 15, pack: 1, int: [30, 45], cob: 4,
      esc: { cera: 0.45, grano: 0.5, envases: 1, etiquetas: 1 },
      ruta: [['mezcladora', 40, 0.8], EMB(0.1)] },
    { id: 'PS-VE', nombre: 'Pasta sólida verde (barra 1 kg)', fam: 'pastas', precio: 10.5, base: 10, pack: 1, int: [30, 45, 60], cob: 3,
      esc: { cera: 0.45, grano: 0.5, envases: 1, etiquetas: 1 },
      ruta: [['mezcladora', 40, 0.8], EMB(0.1)] },
    { id: 'PS-MA', nombre: 'Pasta sólida marrón (barra 1 kg)', fam: 'pastas', precio: 9, base: 8, pack: 1, int: [45, 60], cob: 12,
      esc: { cera: 0.45, grano: 0.5, envases: 1, etiquetas: 1 },
      ruta: [['mezcladora', 40, 0.8], EMB(0.1)] },
    { id: 'PL-5', nombre: 'Pasta líquida (garrafa 5 kg)', fam: 'pastas', precio: 38, base: 4, pack: 1, int: [45, 60], cob: 5,
      esc: { cera: 2.3, grano: 2.5, envases: 1, etiquetas: 1 },
      ruta: [['mezcladora', 40, 2.5], EMB(0.2)] },
  ];

  const DISTRIBUCION = [
    { id: '3M-CUB', nombre: '3M Cubitron II disco de fibra 125', fam: '3m', precio: 2.8, base: 50, pack: 25, int: [30, 45] },
    { id: '3M-SB', nombre: '3M Scotch-Brite disco Roloc', fam: '3m', precio: 4.5, base: 20, pack: 10, int: [45, 60] },
    { id: 'SI-ROLL', nombre: 'sia rollo de lija 115 mm × 50 m', fam: 'sia', precio: 18, base: 4, pack: 1, int: [30, 45] },
    { id: 'SI-VEL', nombre: 'sia disco velcro 150 mm', fam: 'sia', precio: 0.6, base: 200, pack: 50, int: [30, 45] },
    { id: 'KL-SMT', nombre: 'Klingspor disco de láminas SMT 624', fam: 'klingspor', precio: 3.2, base: 60, pack: 10, int: [30, 45] },
    { id: 'KL-KRON', nombre: 'Klingspor corte Kronenflex 125', fam: 'klingspor', precio: 1.1, base: 150, pack: 25, int: [21, 30] },
    { id: 'FE-WSG', nombre: 'Fein amoladora WSG 12-125', fam: 'fein', precio: 320, base: 0.3, pack: 1, int: [180] },
    { id: 'FE-ACC', nombre: 'Fein accesorio MultiMaster', fam: 'fein', precio: 25, base: 3, pack: 1, int: [60, 90] },
  ];

  const PERFILES = {
    pulidor: { n: [4, 6], productos: ['DT-150-12', 'DT-200-20', 'DT-300-30', 'DS-200-G', 'DS-250-G', 'DS-150-C', 'DF-150-10', 'DF-250-20', 'MA-125', 'TT-150', 'TT-250', 'CU-200', 'ES-200', 'PS-BL', 'PS-VE', 'PS-MA', 'PL-5', '3M-SB'] },
    metal: { n: [3, 5], productos: ['AC-125-10', 'AC-115-10', 'AC-230-19', 'AL-125-60', 'AL-125-80', 'AL-115-120', 'MA-125', 'MA-200', '3M-CUB', 'KL-SMT', 'KL-KRON', 'FE-WSG', 'FE-ACC'] },
    distribuidor: { n: [6, 8], productos: ['DT-150-12', 'DT-200-20', 'DS-200-G', 'DS-150-C', 'DF-150-10', 'MA-125', 'TT-150', 'PS-BL', 'PS-VE', 'AC-125-10', 'AC-115-10', 'AC-230-19', 'AL-125-60', 'AL-125-80', '3M-CUB', 'SI-VEL', 'KL-SMT', 'KL-KRON', 'FE-ACC'] },
    carpinteria: { n: [3, 4], productos: ['SI-ROLL', 'SI-VEL', 'MA-125', 'MA-200', 'DT-150-12', 'TT-150', 'DF-150-10'] },
  };

  const COMERCIALES = [
    { id: 'alvaro', nombre: 'Álvaro' },
    { id: 'javi', nombre: 'Javi' },
    { id: 'javi-jefe', nombre: 'Javi jefe' },
  ];

  // Clientes inventados. alta: días desde el alta (solo clientes nuevos).
  // habitos: sustituyen a los aleatorios · extra: se añaden a los aleatorios (casos de la demo).
  // exacto: pedidos hacia atrás desde `ultimo` días con esos intervalos · caida: factor en los últimos días · corte: deja de pedir.
  const CLIENTES = [
    // Álvaro · Valencia norte y Castellón
    { nombre: 'Talleres Alba', provincia: 'Valencia', localidad: 'Paterna', comercial: 'alvaro', perfil: 'pulidor', tam: 1.2,
      habitos: [
        { p: 'DS-200-G', cantidad: 120, exacto: { ultimo: 12, intervalos: [30] }, caida: { dias: 60, factor: 0.45 } },
        { p: 'DT-150-12', intervalo: 30, cantidad: 70 },
        { p: 'PS-BL', intervalo: 45, cantidad: 20 },
        { p: 'MA-125', intervalo: 60, cantidad: 50 },
      ] },
    { nombre: 'Metalistería Hermanos Ferrer', provincia: 'Valencia', localidad: 'Burjassot', comercial: 'alvaro', perfil: 'metal', tam: 1 },
    { nombre: 'Pulidos Levante', provincia: 'Valencia', localidad: 'Manises', comercial: 'alvaro', perfil: 'pulidor', tam: 1.4 },
    { nombre: 'Inoxidables del Turia', provincia: 'Valencia', localidad: 'Riba-roja de Túria', comercial: 'alvaro', perfil: 'metal', tam: 1.5, tendencia: 0.45 },
    { nombre: 'Cerrajería Sagunto', provincia: 'Valencia', localidad: 'Sagunto', comercial: 'alvaro', perfil: 'metal', tam: 0.6 },
    { nombre: 'Suministros Industriales Llíria', provincia: 'Valencia', localidad: 'Llíria', comercial: 'alvaro', perfil: 'distribuidor', tam: 1.3 },
    { nombre: 'Grifería Camp de Morvedre', provincia: 'Valencia', localidad: 'Puerto de Sagunto', comercial: 'alvaro', perfil: 'pulidor', tam: 1.1 },
    { nombre: 'Cerámicas y Metales Castalia', provincia: 'Castellón', localidad: 'Castellón de la Plana', comercial: 'alvaro', perfil: 'metal', tam: 0.9 },
    { nombre: 'Talleres Vila-real', provincia: 'Castellón', localidad: 'Vila-real', comercial: 'alvaro', perfil: 'pulidor', tam: 0.8 },
    { nombre: 'Ferretería Industrial Onda', provincia: 'Castellón', localidad: 'Onda', comercial: 'alvaro', perfil: 'distribuidor', tam: 0.9, tendencia: -0.22 },
    { nombre: 'Pulidos Benicarló', provincia: 'Castellón', localidad: 'Benicarló', comercial: 'alvaro', perfil: 'pulidor', tam: 0.7 },
    { nombre: 'Mobiliario Metálico Burriana', provincia: 'Castellón', localidad: 'Burriana', comercial: 'alvaro', perfil: 'carpinteria', tam: 1 },
    { nombre: 'Carpintería Metálica Alboraya', provincia: 'Valencia', localidad: 'Alboraya', comercial: 'alvaro', perfil: 'metal', tam: 0.7 },
    { nombre: 'Cromados Paterna', provincia: 'Valencia', localidad: 'Paterna', comercial: 'alvaro', perfil: 'pulidor', tam: 0.8, alta: 25 },
    { nombre: 'Estructuras Vinaròs', provincia: 'Castellón', localidad: 'Vinaròs', comercial: 'alvaro', perfil: 'metal', tam: 0.9, alta: 63 },
    // Javi · Valencia sur, Alicante, Murcia y Albacete
    { nombre: 'Distribuciones Gandía', provincia: 'Valencia', localidad: 'Gandía', comercial: 'javi', perfil: 'distribuidor', tam: 2,
      habitos: [
        { p: 'AC-125-10', cantidad: 400, exacto: { ultimo: 90, intervalos: [90, 91, 89, 90, 92, 88] } },
        { p: 'DT-150-12', intervalo: 30, cantidad: 100 },
        { p: 'DS-250-G', intervalo: 45, cantidad: 60 },
        { p: 'PS-VE', intervalo: 30, cantidad: 20 },
        { p: 'KL-KRON', intervalo: 30, cantidad: 200 },
        { p: '3M-SB', intervalo: 60, cantidad: 40 },
      ] },
    { nombre: 'Talleres Xàtiva', provincia: 'Valencia', localidad: 'Xàtiva', comercial: 'javi', perfil: 'pulidor', tam: 1,
      extra: [{ p: 'DS-150-C', cantidad: 40, exacto: { ultimo: 38, intervalos: [30, 31, 29] } }] },
    { nombre: 'Pulidos Ontinyent', provincia: 'Valencia', localidad: 'Ontinyent', comercial: 'javi', perfil: 'pulidor', tam: 1.2 },
    { nombre: 'Metales Alzira', provincia: 'Valencia', localidad: 'Alzira', comercial: 'javi', perfil: 'metal', tam: 1.1,
      habitos: [
        { p: 'AC-115-10', cantidad: 300, exacto: { ultimo: 18, intervalos: [30] }, caida: { dias: 60, factor: 0.62 } },
        { p: 'AL-125-80', intervalo: 45, cantidad: 150 },
        { p: 'KL-SMT', intervalo: 45, cantidad: 60 },
      ] },
    { nombre: 'Cuchillería Hermanos Albacete', provincia: 'Albacete', localidad: 'Albacete', comercial: 'javi', perfil: 'pulidor', tam: 1.3 },
    { nombre: 'Navajas La Mancha', provincia: 'Albacete', localidad: 'Albacete', comercial: 'javi', perfil: 'pulidor', tam: 0.9 },
    { nombre: 'Inox Elche', provincia: 'Alicante', localidad: 'Elche', comercial: 'javi', perfil: 'metal', tam: 1.2 },
    { nombre: 'Cromados Elche', provincia: 'Alicante', localidad: 'Elche', comercial: 'javi', perfil: 'pulidor', tam: 1,
      habitos: [
        { p: 'PS-BL', intervalo: 30, cantidad: 30, corte: 150 },
        { p: 'DT-200-20', intervalo: 30, cantidad: 40 },
        { p: 'DS-200-G', intervalo: 45, cantidad: 60 },
        { p: 'TT-150', intervalo: 45, cantidad: 30 },
      ] },
    { nombre: 'Hormas y Calzado Elda', provincia: 'Alicante', localidad: 'Elda', comercial: 'javi', perfil: 'carpinteria', tam: 0.8 },
    { nombre: 'Juguetes Ibi Metal', provincia: 'Alicante', localidad: 'Ibi', comercial: 'javi', perfil: 'metal', tam: 0.8, tendencia: 0.28 },
    { nombre: 'Grifería Alcoy', provincia: 'Alicante', localidad: 'Alcoy', comercial: 'javi', perfil: 'pulidor', tam: 1.5 },
    { nombre: 'Suministros Murcia Industrial', provincia: 'Murcia', localidad: 'Murcia', comercial: 'javi', perfil: 'distribuidor', tam: 1.4,
      extra: [{ p: 'AC-230-19', cantidad: 150, exacto: { ultimo: 57, intervalos: [45, 46, 44] } }] },
    { nombre: 'Talleres Cartagena Naval', provincia: 'Murcia', localidad: 'Cartagena', comercial: 'javi', perfil: 'metal', tam: 1.3 },
    { nombre: 'Muebles Yecla Metal', provincia: 'Murcia', localidad: 'Yecla', comercial: 'javi', perfil: 'carpinteria', tam: 1.1 },
    { nombre: 'Pulidos Lorca', provincia: 'Murcia', localidad: 'Lorca', comercial: 'javi', perfil: 'pulidor', tam: 0.7, alta: 12 },
    { nombre: 'Herrajes Villena', provincia: 'Alicante', localidad: 'Villena', comercial: 'javi', perfil: 'metal', tam: 0.8, alta: 41 },
    // Javi jefe · grandes cuentas, Madrid, Barcelona y Zaragoza
    { nombre: 'Grupo Inoxmad', provincia: 'Madrid', localidad: 'Getafe', comercial: 'javi-jefe', perfil: 'metal', tam: 3.2 },
    { nombre: 'Suministros Industriales Centro', provincia: 'Madrid', localidad: 'Alcobendas', comercial: 'javi-jefe', perfil: 'distribuidor', tam: 2.8 },
    { nombre: 'Pulimentos Castilla', provincia: 'Madrid', localidad: 'Móstoles', comercial: 'javi-jefe', perfil: 'pulidor', tam: 1.8 },
    { nombre: 'Metalúrgica Coslada', provincia: 'Madrid', localidad: 'Coslada', comercial: 'javi-jefe', perfil: 'metal', tam: 1.6, tendencia: -0.25 },
    { nombre: 'Distribuidora Abrasivos Catalunya', provincia: 'Barcelona', localidad: 'Sabadell', comercial: 'javi-jefe', perfil: 'distribuidor', tam: 3 },
    { nombre: 'Poliments Vallès', provincia: 'Barcelona', localidad: 'Terrassa', comercial: 'javi-jefe', perfil: 'pulidor', tam: 1.5 },
    { nombre: 'Inox Mataró', provincia: 'Barcelona', localidad: 'Mataró', comercial: 'javi-jefe', perfil: 'metal', tam: 1.4 },
    { nombre: 'Cuberterías del Llobregat', provincia: 'Barcelona', localidad: 'Cornellà de Llobregat', comercial: 'javi-jefe', perfil: 'pulidor', tam: 2.2, tendencia: 0.24 },
    { nombre: 'Aragonesa de Pulidos', provincia: 'Zaragoza', localidad: 'Zaragoza', comercial: 'javi-jefe', perfil: 'pulidor', tam: 1.6 },
    { nombre: 'Calderería del Ebro', provincia: 'Zaragoza', localidad: 'Utebo', comercial: 'javi-jefe', perfil: 'metal', tam: 1.5 },
    { nombre: 'Suministros Zaragoza Industrial', provincia: 'Zaragoza', localidad: 'Zaragoza', comercial: 'javi-jefe', perfil: 'distribuidor', tam: 1.7 },
    { nombre: 'Valenciana de Grifería', provincia: 'Valencia', localidad: 'Quart de Poblet', comercial: 'javi-jefe', perfil: 'pulidor', tam: 3 },
    { nombre: 'Ascensores Levante Inox', provincia: 'Valencia', localidad: 'Silla', comercial: 'javi-jefe', perfil: 'metal', tam: 2.5 },
    { nombre: 'Tubos Pulidos Rubí', provincia: 'Barcelona', localidad: 'Rubí', comercial: 'javi-jefe', perfil: 'metal', tam: 1.4, alta: 80 },
  ];

  const NOTAS_VISITA = [
    'Revisión de consumos y stock en planta',
    'Presentación del disco ALBAIT inox',
    'Prueba de discos de sisal en la línea de pulido',
    'Negociación de tarifa anual',
    'Entrega de muestras y demostración',
    'Visita técnica con el jefe de taller',
    'Seguimiento del pedido periódico',
    'Revisión de reclamación: resuelta',
    'Presentación de pastas de pulido',
    'Formación de seguridad en corte',
  ];

  // [cliente, producto, días desde el envío, estado, feedback]
  const MUESTRAS = [
    ['Pulidos Lorca', 'DS-200-G', 9, 'pendiente', ''],
    ['Herrajes Villena', 'AC-125-10', 20, 'pendiente', ''],
    ['Tubos Pulidos Rubí', 'AL-125-80', 34, 'pendiente', ''],
    ['Poliments Vallès', 'DF-250-20', 18, 'pendiente', ''],
    ['Grifería Alcoy', 'DS-150-C', 15, 'pendiente', ''],
    ['Calderería del Ebro', 'AC-230-19', 6, 'pendiente', ''],
    ['Grupo Inoxmad', 'AL-125-60', 45, 'pedido', 'Rinde un 30 % más que su disco actual. Primer pedido de 2.000 uds.'],
    ['Navajas La Mancha', 'PS-VE', 52, 'positivo', 'Buen brillo final en la hoja; pendiente de precio por volumen.'],
    ['Cerámicas y Metales Castalia', 'MA-200', 61, 'negativo', 'Demasiado agresivo para su acabado satinado.'],
    ['Cromados Paterna', 'DT-200-20', 23, 'positivo', 'Les gusta el cosido; quieren probar el Ø300.'],
    ['Juguetes Ibi Metal', 'AC-115-10', 75, 'pedido', 'Sustituyen su marca actual en la línea 2.'],
    ['Inox Mataró', 'AL-115-120', 88, 'negativo', 'Prefieren grano 80: enviar nueva muestra.'],
    ['Pulimentos Castilla', 'CU-200', 102, 'pedido', 'Pedido inicial de 200 uds.'],
    ['Estructuras Vinaròs', 'AC-125-10', 40, 'positivo', 'Corte limpio y sin rebaba. Esperan aprobación de compras.'],
    ['Talleres Cartagena Naval', 'AL-125-60', 130, 'pedido', 'Homologado para el astillero; pedido mensual.'],
  ];

  /* ---------- Utilidades ---------- */

  function mulberry32(semilla) {
    let a = semilla >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const DIA = 86400000;
  const dia = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const diasEntre = (a, b) => Math.round((b - a) / DIA);
  const mesClave = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const redondeoPack = (n, pack) => Math.max(pack, Math.round(n / pack) * pack);
  const dos = n => Math.round(n * 100) / 100;

  function mesesCompletos(hoy, n) {
    const r = [];
    for (let i = n; i > 0; i--) r.push(mesClave(new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)));
    return r;
  }

  /* ---------- Generador ---------- */

  function generarDatosDemo({ hoy = new Date(), semilla = 1970 } = {}) {
    const rnd = mulberry32(semilla);
    const entre = (a, b) => a + (b - a) * rnd();
    const entero = (a, b) => Math.floor(entre(a, b + 1));
    const elegir = lista => lista[Math.floor(rnd() * lista.length)];

    hoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - 36, 1);

    const catalogo = new Map([...PROPIOS, ...DISTRIBUCION].map(p => [p.id, p]));

    // Clientes y hábitos de compra
    const clientes = [];
    const habitos = [];
    CLIENTES.forEach((def, i) => {
      const id = 'C' + String(i + 1).padStart(3, '0');
      const fechaAlta = def.alta ? dia(hoy, -def.alta) : dia(hoy, -entero(4 * 365, 15 * 365));
      clientes.push({ id, nombre: def.nombre, provincia: def.provincia, localidad: def.localidad, comercialId: def.comercial, fechaAlta });
      const descuento = entre(0, 0.12);
      const tendencia = def.tendencia !== undefined ? def.tendencia : entre(-0.06, 0.1);
      let lista = def.habitos;
      if (!lista) {
        const perfil = PERFILES[def.perfil];
        const fijos = new Set((def.extra || []).map(h => h.p));
        const pool = perfil.productos.filter(id => !fijos.has(id));
        const n = entero(perfil.n[0], perfil.n[1]);
        lista = [];
        for (let k = 0; k < n && pool.length; k++) {
          const p = catalogo.get(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
          const intervalo = elegir(p.int);
          lista.push({ p: p.id, intervalo, cantidad: p.base * def.tam * intervalo / 30.44 * entre(0.6, 1.4) });
        }
        lista.push(...(def.extra || []));
      }
      for (const h of lista) habitos.push({ ...h, clienteId: id, descuento, tendencia, desde: fechaAlta > inicio ? dia(fechaAlta, entero(2, 8)) : inicio });
    });

    // Pedidos (una línea por pedido de un hábito)
    const brutos = [];
    for (const h of habitos) {
      const prod = catalogo.get(h.p);
      const fechas = [];
      if (h.exacto) {
        let f = dia(hoy, -h.exacto.ultimo);
        let k = 0;
        while (f >= h.desde) {
          fechas.unshift(f);
          f = dia(f, -h.exacto.intervalos[k++ % h.exacto.intervalos.length]);
        }
      } else {
        let f = dia(h.desde, Math.floor(rnd() * h.intervalo));
        while (f <= hoy) {
          fechas.push(f);
          f = dia(f, Math.max(1, Math.round(h.intervalo * entre(0.9, 1.1))));
        }
      }
      for (const fecha of fechas) {
        const atras = diasEntre(fecha, hoy);
        if (h.corte && atras < h.corte) continue;
        let q = h.cantidad * Math.pow(1 + h.tendencia, -atras / 365) * entre(h.exacto ? 0.95 : 0.9, h.exacto ? 1.05 : 1.1);
        if (h.caida && atras < h.caida.dias) q *= h.caida.factor;
        const cantidad = redondeoPack(q, prod.pack);
        brutos.push({ clienteId: h.clienteId, fecha, lineas: [{ productoId: prod.id, cantidad, importe: dos(cantidad * prod.precio * (1 - h.descuento)) }] });
      }
    }
    brutos.sort((a, b) => a.fecha - b.fecha || a.clienteId.localeCompare(b.clienteId));
    const pedidos = brutos.map((p, i) => ({ id: 'PV' + String(i + 1).padStart(5, '0'), ...p }));

    // Media de los últimos 12 meses completos por producto (para fijar stock)
    const ultimos12 = new Set(mesesCompletos(hoy, 12));
    const vendido12 = new Map();
    for (const p of pedidos) {
      if (!ultimos12.has(mesClave(p.fecha))) continue;
      for (const l of p.lineas) vendido12.set(l.productoId, (vendido12.get(l.productoId) || 0) + l.cantidad);
    }
    const media12 = id => (vendido12.get(id) || 0) / 12;

    const familiaDe = new Map(PROPIOS.map(p => [p.id, p.fam]));
    const FACTOR_FABRICACION = { franela: 2.4, sisal: 0.72, tejana: 1.35, malla: 0.9 };

    const productos = [
      ...PROPIOS.map(p => ({
        id: p.id, ref: p.id, nombre: p.nombre, familiaId: p.fam, precioVenta: p.precio,
        stock: Math.max(p.pack * 4, redondeoPack(media12(p.id) * p.cob, p.pack)),
        escandallo: Object.entries(p.esc).map(([materialId, cantidad]) => ({ materialId, cantidad })),
        ruta: p.ruta.map(([maquinaId, minPreparacion, minUnidad]) => ({ maquinaId, minPreparacion, minUnidad })),
      })),
      ...DISTRIBUCION.map(p => ({
        id: p.id, ref: p.id, nombre: p.nombre, familiaId: p.fam, precioVenta: p.precio,
        stock: redondeoPack(media12(p.id) * 2, p.pack),
      })),
    ];

    // Materias primas: stock = consumo mensual estimado × meses objetivo
    const consumo = new Map();
    for (const p of PROPIOS) {
      for (const [m, q] of Object.entries(p.esc)) consumo.set(m, (consumo.get(m) || 0) + q * media12(p.id));
    }
    const materiales = MATERIALES.map(([id, nombre, unidad, costeUd, meses]) => {
      const bruto = meses === null ? STOCK_GRAPAS : consumo.get(id) * meses;
      const paso = bruto > 1000 ? 100 : bruto > 100 ? 10 : 1;
      return { id, nombre, unidad, costeUd, stock: Math.round(bruto / paso) * paso };
    });

    const maquinas = MAQUINAS.map(([id, nombre, tarifaHora, operarios]) => ({ id, nombre, tarifaHora, operarios }));

    // Producción histórica de los últimos 12 meses
    const produccionHistorica = [];
    for (const p of PROPIOS) {
      const factor = FACTOR_FABRICACION[familiaDe.get(p.id)] || 1;
      for (const mes of ultimos12) {
        const unidades = redondeoPack(media12(p.id) * factor * entre(0.6, 1.4), p.pack);
        produccionHistorica.push({ productoId: p.id, mes, unidades });
      }
    }

    // Visitas de los últimos 6 meses
    const visitas = [];
    for (const c of clientes) {
      const nuevos = diasEntre(c.fechaAlta, hoy) <= 90;
      if (nuevos) visitas.push({ clienteId: c.id, comercialId: c.comercialId, fecha: c.fechaAlta, nota: 'Primera visita · alta de cliente' });
      const n = nuevos ? entero(0, 1) : entero(0, 4);
      for (let k = 0; k < n; k++) {
        const atras = entero(1, nuevos ? diasEntre(c.fechaAlta, hoy) : 175);
        visitas.push({ clienteId: c.id, comercialId: c.comercialId, fecha: dia(hoy, -atras), nota: elegir(NOTAS_VISITA) });
      }
    }
    visitas.sort((a, b) => a.fecha - b.fecha || a.clienteId.localeCompare(b.clienteId));
    visitas.forEach((v, i) => { v.id = 'V' + String(i + 1).padStart(4, '0'); });

    const clientePorNombre = new Map(clientes.map(c => [c.nombre, c]));
    const muestras = MUESTRAS.map(([nombre, productoId, atras, estado, feedback], i) => {
      const c = clientePorNombre.get(nombre);
      return { id: 'M' + String(i + 1).padStart(3, '0'), clienteId: c.id, productoId, comercialId: c.comercialId, fechaEnvio: dia(hoy, -atras), estado, feedback };
    });

    return {
      hoy,
      semilla,
      config: { costeOperarioHora: 22, horasJornada: 8 },
      familias: FAMILIAS.map(f => ({ ...f })),
      materiales,
      maquinas,
      productos,
      comerciales: COMERCIALES.map(c => ({ ...c })),
      clientes,
      pedidos,
      produccionHistorica,
      visitas,
      muestras,
      ordenes: [],
    };
  }

  const api = { generarDatosDemo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.BolbaiteDatos = api;
})(typeof window !== 'undefined' ? window : globalThis);
