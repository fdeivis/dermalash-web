**DERMALASH**

**Diseño Funcional del Sitio Web y Sistema de Gestión**

Centro Estético - Lima, Perú

| | |
|---|---|
| **Documento** | Diseño Funcional |
| **Versión** | 2.0 |
| **Estado** | Vigente — MVP1 y MVP2 completados, MVP3 en definición |
| **Fecha** | Septiembre 2026 |

## Historial de versiones

| Versión | Fecha | Cambios principales |
|---|---|---|
| 1.0 | Septiembre 2026 | Documento inicial. Alcance completo propuesto en 6 etapas (MVP1-MVP6). |
| 2.0 | Septiembre 2026 | Se reordena el plan de implementación: Agenda pasa a MVP3, WhatsApp + IA a MVP4, y Proveedores/Gastos/Caja pasan a MVP5. Se detalla por completo el módulo de Agenda y turnos (horarios por profesional, estados, vínculo con sesiones, permisos) y el módulo de WhatsApp + IA (Claude). Se agrega el rol **Administrador**. Se marca la duración del servicio como obligatoria. |

# 1. Objetivo y alcance

El objetivo es implementar una solución digital para Dermalash compuesta
por dos componentes integrados: (1) un sitio público orientado a
clientes y captación comercial, y (2) un módulo privado para la gestión
operativa y administrativa del centro estético.

La solución deberá ser simple de utilizar, visualmente sofisticada y
escalable. El contenido comercial deberá poder mantenerse sin
conocimientos de programación, mientras que las funciones internas
estarán controladas por roles y permisos.

## 1.1 Componentes

- Sitio público: información institucional, tratamientos, precios,
  promociones, novedades/notas, ubicación, mapa y contacto por
  WhatsApp.

- Módulo privado: clientes, empleados, sesiones, agenda, proveedores,
  gastos, caja, reportes y configuración.

- Integraciones: WhatsApp con un asistente de Inteligencia Artificial
  para reservas, cancelaciones, reprogramaciones y comunicaciones
  automáticas (ver sección 9).

## 1.2 Principios de diseño

- Estética elegante, minimalista y premium, con transiciones sutiles y
  navegación simple.

- Diseño responsive para celular, tablet y escritorio.

- Operación sencilla: los usuarios internos no deben requerir
  conocimientos técnicos.

- Seguridad y trazabilidad para información privada y sensible.

- Arquitectura preparada para incorporar nuevas funcionalidades por
  etapas.

# 2. Sitio público

El sitio público será la presencia digital de Dermalash y tendrá como
objetivo informar, generar confianza y convertir visitas en consultas o
reservas.

| **Sección** | **Contenido principal** | **Acción esperada** |
|---|---|---|
| Inicio | Propuesta de valor, imagen/video principal, tratamientos destacados, promociones y llamadas a la acción. | Consultar / reservar |
| Tratamientos | Catálogo editable con nombre, descripción, duración referencial, precio o precio desde, imágenes y estado. | Consultar tratamiento |
| Promociones | Promociones vigentes con fechas, condiciones e imagen. | Consultar promoción |
| Novedades / Notas | Publicaciones informativas, novedades y contenido comercial. | Leer / compartir |
| Nosotros | Presentación del centro, propuesta de valor y equipo cuando corresponda. | Generar confianza |
| Ubicación | Dirección, horarios, mapa y referencias. | Cómo llegar |
| Contacto / Reserva | WhatsApp como canal principal; otros datos de contacto si se definen. | Iniciar conversación |

## 2.1 Administración de contenido público

El rol Socio podrá crear, modificar, publicar, despublicar y ordenar
servicios, precios, promociones y publicaciones/notas desde una interfaz
administrativa. Los cambios deberán reflejarse en el sitio público sin
requerir edición de código.

# 3. Usuarios, roles y permisos

El módulo privado cuenta con cuatro roles: **Socio**, **Administrador**,
**Encargado** y **Esteticista**. Cada usuario se autentica con
credenciales individuales.

El rol **Administrador** es un rol técnico agregado en esta versión,
distinto del Socio: el Socio sigue siendo el rol de negocio (dueño del
centro), mientras que Administrador concentra operaciones irreversibles
y de mantenimiento del sistema (por ejemplo, borrados definitivos) como
una capa adicional de control. Su alcance fuera de Agenda y Sesiones
queda pendiente de definición (ver sección 18).

| **Funcionalidad** | **Socio** | **Administrador** | **Encargado** | **Esteticista** |
|---|---|---|---|---|
| Contenido web | Administrar | — | — | — |
| Clientes | Crear / consultar / modificar | Crear / consultar / modificar | Crear / consultar / modificar | Crear / consultar / modificar |
| Sesiones — registrar | Sí | Sí | Sí | Sí |
| Sesiones — borrar (registrada por error) | Sí | Sí | No | No |
| Empleados | Administrar | — | — | — |
| Sueldos referenciales | Administrar | — | — | — |
| Agenda propia | Consultar / gestionar | Consultar / gestionar | Consultar / gestionar | Consultar (solo lectura) |
| Agenda general — crear / modificar / cancelar turno | Sí | Sí | Sí | No |
| Agenda general — borrar turno (definitivo) | No | Sí | No | No |
| Proveedores | Administrar | — | Administrar | — |
| Gastos / egresos | Administrar | — | Administrar | — |
| Caja | Administrar | — | Administrar | — |
| Adelantos a socios | Administrar | — | — | — |
| Balance / reportes financieros | Consultar | — | — | — |

> Cambio respecto a la v1.0: el Esteticista pasa a ser **solo lectura**
> sobre su propia agenda (antes podía "gestionar" su turno propio).

## 3.1 Reglas generales de seguridad

- No compartir usuarios entre empleados; cada acción debe quedar
  asociada al usuario que la realizó.

- Aplicar permisos por rol tanto en pantalla como en las operaciones
  del sistema.

- Registrar fecha, hora y usuario de altas y modificaciones
  relevantes.

- Los borrados definitivos (turnos, sesiones, empleados, clientes)
  deben conservar rastro en el registro de auditoría aunque el
  registro original deje de existir.

- Proteger fotografías, documentos y antecedentes del cliente; no
  deben ser públicos ni accesibles por URL sin autorización.

- Definir política de copias de seguridad, recuperación y baja de
  usuarios.

# 4. Dashboard

La pantalla inicial será distinta según el rol. El Socio tendrá una
vista ejecutiva; el Encargado priorizará agenda, caja y operación; el
Esteticista visualizará principalmente sus turnos y sesiones.

- Socio: ventas del día/semana/mes, gastos, resultado, caja, turnos,
  clientes nuevos/recurrentes y alertas.

- Administrador: bandeja de alertas y accesos a las operaciones
  restringidas a su rol (borrados definitivos).

- Encargado: agenda general, próximos turnos, caja abierta,
  incidencias y accesos rápidos.

- Esteticista: agenda propia del día, ficha del próximo cliente y
  acceso a registrar sesión.

Socio, Administrador y Encargado ven además una **bandeja de alertas**
con toda creación, modificación o cancelación de turnos — generada por
otro usuario o por el asistente de WhatsApp — para que ninguna acción
quede sin conocimiento de un humano (ver sección 8.6).

# 5. Gestión de clientes

## 5.1 Ficha de cliente

- Nombre y apellido.

- Fecha de nacimiento y sexo.

- Documento/identificador, cuando corresponda.

- Teléfono, WhatsApp, correo y otros datos de contacto.

- Observaciones relevantes.

- Fotografías y documentos adjuntos.

- Antecedentes de salud/documentación relacionada, sujeto a los
  controles de privacidad definidos.

- Historial de sesiones y futuros turnos.

## 5.2 Reglas funcionales

- Antes de crear un cliente, buscar coincidencias para reducir
  duplicados.

- Permitir consultar el historial completo desde la ficha.

- Los archivos deberán registrar quién los adjuntó y cuándo.

- La eliminación de información sensible deberá estar restringida y,
  preferentemente, conservar trazabilidad.

# 6. Gestión de empleados

- Alta y modificación por rol Socio.

- Datos: nombre, apellido, dirección, fecha de nacimiento,
  identificador único y contacto.

- Tipo de empleado: Esteticista o Encargado.

- Adjuntar currículum y soporte de estudios/certificaciones.

- Registrar sueldo referencial mediante períodos de vigencia (fecha
  desde / fecha hasta / monto), conservando historial.

- Estado del empleado: activo/inactivo, evitando eliminar históricos
  vinculados a sesiones o caja.

# 7. Catálogo de servicios, promociones y sesiones

## 7.1 Catálogo

- Servicio con nombre, descripción, **duración obligatoria** (en
  minutos), precio vigente, imágenes y estado activo/inactivo. La
  duración es obligatoria desde esta versión porque el módulo de
  Agenda (sección 8) la necesita para calcular el bloque horario de
  cada turno.

- Historial de precios con vigencia para preservar correctamente
  operaciones anteriores.

- Promociones con período de vigencia, condiciones, precio promocional
  y servicios asociados.

## 7.2 Registro de sesión

- Seleccionar cliente existente o crearlo durante el proceso.

- Seleccionar uno o varios servicios realizados.

- Proponer automáticamente el precio/promoción vigente a la fecha de
  la sesión.

- Permitir definir el monto total final cuando existan combinaciones o
  ajustes autorizados.

- Registrar medio de pago y observaciones.

- Vincular la sesión al profesional que atendió.

- Si la sesión se origina desde un turno reservado (sección 8), queda
  vinculada a ese turno y **el turno pasa automáticamente al estado
  "Atendido"** al guardar la sesión — no existe un botón manual
  separado para marcar un turno como atendido, evitando que ambos
  registros queden desincronizados.

- Si esa sesión se borra por error (Socio o Administrador, sección 3),
  el turno vinculado **vuelve al estado "Confirmado"**.

- Al confirmar una sesión cobrada, generar el ingreso correspondiente
  para caja evitando doble carga.

- En una etapa posterior (fuera de MVP3), ofrecer como atajo crear el
  próximo turno directamente desde la sesión recién registrada; por
  ahora se crea manualmente desde la sección de Agenda.

# 8. Agenda y turnos — MVP3

## 8.1 Concepto

Cada esteticista, y el Encargado cuando también atiende, tiene su
propia disponibilidad independiente: **no existe un calendario único
compartido**, sino varios calendarios en paralelo. La vista de agenda
los combina en una grilla (columnas por profesional, filas por
horario) para ver de un vistazo quién está libre en un bloque
determinado.

```
         09:00      10:00           11:00      12:00
Ana      [Turno]    libre           libre      [Turno]
Lucía    libre      [Turno: Carla]  libre       libre
Pedro    [Turno]    libre           libre      libre
```

Al reservar, el cliente no elige un profesional específico salvo que lo
pida: el sistema (o el asistente de WhatsApp) ofrece el primer
profesional disponible en el horario elegido.

## 8.2 Horarios de trabajo

- Cada esteticista, y cada Encargado que también atienda, tiene un
  horario semanal recurrente configurable (días y franjas horarias).

- Se pueden cargar excepciones puntuales sobre ese horario (día libre,
  licencia, vacaciones) sin alterar la configuración general.

- Un turno no puede reservarse fuera del horario vigente de la persona,
  salvo que Encargado, Socio o Administrador lo fuercen explícitamente,
  dejando aviso visible en el turno.

## 8.3 Turno

Datos del turno: cliente, profesional asignado, servicio(s) —la
duración total sale de la duración de cada servicio del catálogo—,
fecha/hora de inicio y fin, estado, origen (manual o WhatsApp), y
usuario (o IA) que lo creó y lo modificó por última vez.

Estados: **Reservado**, **Confirmado**, **Atendido**, **Cancelado**,
**No asistió**.

Regla dura, validada en el servidor: nunca dos turnos superpuestos para
el mismo profesional.

## 8.4 Cancelación, modificación y borrado

| Acción | Quién puede hacerla | Condición |
|---|---|---|
| Crear turno | Encargado, Socio, Administrador, IA de WhatsApp (a pedido del cliente) | — |
| Modificar / reprogramar turno | Encargado, Socio, Administrador, IA de WhatsApp (a pedido del cliente) | Queda trazado quién, cuándo y de qué a qué |
| Cancelar turno | Encargado, Socio, Administrador, IA de WhatsApp (a pedido del cliente) | Solo si el turno no tiene una sesión vinculada activa |
| Borrar turno (definitivo) | Solo Administrador | Conserva rastro en el registro de auditoría aunque el turno deje de existir |

Toda creación, modificación o cancelación de un turno genera una alerta
en el panel privado (sección 8.6), sin importar si la originó un
humano o el asistente de IA.

## 8.5 Vínculo con sesiones

Ver sección 7.2: registrar la sesión es lo que marca el turno como
Atendido; no es una acción manual independiente. Borrar esa sesión por
error devuelve el turno a "Confirmado".

## 8.6 Alertas de agenda

- Bandeja de notificaciones en el panel, visible para Encargado, Socio
  y Administrador, que informa cada turno creado, modificado o
  cancelado.

- Cada alerta indica origen (manual o WhatsApp), tipo de acción y
  turno afectado — con foco especial en las originadas por el
  asistente de WhatsApp, ya que ahí no intervino nadie del centro.

- Pendiente de definir (sección 18): si el borrado definitivo de un
  turno (exclusivo de Administrador) también debe generar una alerta.

## 8.7 Explícitamente fuera de alcance de MVP3

- Crear el próximo turno como atajo desde una sesión recién
  registrada.

- Que el Esteticista pueda modificar su propio turno (hoy es de solo
  lectura).

- Cualquier integración con calendarios externos (Google Calendar u
  otros): se evaluó y se descartó para esta etapa por complejidad
  operativa (requeriría que cada profesional conecte o comparta una
  cuenta externa); el calendario es propio de la aplicación.

# 9. Integración con WhatsApp e Inteligencia Artificial — MVP4

## 9.1 Objetivo

Permitir que un cliente converse por WhatsApp en lenguaje natural con
un asistente de Inteligencia Artificial (Claude, de Anthropic) que:

- Conoce los servicios y promociones vigentes publicados en el sitio
  (misma fuente de datos que el catálogo público, sección 7.1).

- Consulta la disponibilidad real de la Agenda (sección 8), con las
  mismas reglas y los mismos datos que usa el panel — no hay un
  calendario paralelo para WhatsApp.

- Propone horarios disponibles y, ante la selección del cliente,
  reserva el turno automáticamente en el profesional disponible
  correspondiente, sin importar cuál.

- Asiste cancelaciones y reprogramaciones a pedido del cliente,
  respetando las mismas reglas del módulo de Agenda (por ejemplo, no
  se puede cancelar un turno ya atendido).

## 9.2 Interacción híbrida

La conversación es en lenguaje natural, apoyada en botones/listas
interactivas de WhatsApp para simplificar la selección de fecha,
horario y servicio cuando sea posible, reduciendo ambigüedad y errores
de tipeo.

## 9.3 Notificación al equipo

Toda reserva, modificación o cancelación generada por la IA aparece de
inmediato en la bandeja de alertas del panel privado (sección 8.6),
para que un humano tome conocimiento aunque no haya intervenido.

## 9.4 Estrategia de desarrollo

Para construir y probar el flujo completo sin depender de una cuenta
de WhatsApp Business ni de una URL pública, la primera etapa de
desarrollo simula el canal de mensajería (chat de prueba dentro del
panel admin) detrás de una interfaz de "proveedor de mensajería". La
conexión con un proveedor real de WhatsApp (API de Meta u otro BSP) se
habilita en una etapa posterior, cuando además se defina el mecanismo
de exposición pública necesario para recibir mensajes entrantes
(pendiente, sección 18).

## 9.5 Fuera de alcance de MVP4

- Recordatorios automáticos de turno y seguimiento post-tratamiento
  (quedan para MVP6).

- Cualquier automatización de mensajes salientes no disparada por el
  cliente (por ejemplo, saludos de cumpleaños) — ver sección 14.

# 10. Proveedores — MVP5

- Alta, consulta y modificación por Socio y Encargado.

- Nombre/razón social, datos de contacto e identificador fiscal cuando
  exista.

- Evaluación del proveedor: buena, regular o mala.

- **Sin tabla propia de "compras"**: una compra o servicio contratado a
  un proveedor se registra directamente como un Egreso (sección 11) con
  ese proveedor asociado — así se evita el riesgo original de cargar el
  mismo gasto dos veces (una vez como "compra" y otra como "egreso").
  La ficha del proveedor simplemente lista sus egresos asociados.

# 11. Gastos y egresos — MVP5

- Registro por Socio y Encargado.

- Concepto, categoría, fecha, importe, medio de pago,
  comprobante/factura y observaciones.

- Proveedor opcional; empleado obligatorio cuando la categoría
  corresponda a sueldo (validado en la aplicación, no es una regla de
  base de datos).

- Categorías iniciales: alquiler, internet, luz, agua, inventario,
  sueldos y otros.

- Adelanto de ganancias a socios: categoría especial registrable
  únicamente por Socio.

- Un egreso pagado en efectivo mientras hay una caja abierta queda
  asociado a esa caja (ver sección 12); en otro medio de pago, o sin
  caja abierta, el egreso se registra igual pero sin afectar ningún
  arqueo de efectivo.

# 12. Caja — MVP5

**Decisión de modelado**: la Caja es una **conciliación por medio de
pago**, no solo de efectivo — además del efectivo físico, se puede
conciliar Yape, Plin, tarjeta y transferencia contra el saldo real de
cada cuenta (lo que muestra la app del banco/Yape), con el mismo
mecanismo de apertura/cierre. Puede haber una sesión abierta por cada
medio de pago en simultáneo, pero no dos del mismo medio a la vez.

- Apertura de una sesión de caja para un medio de pago dado, indicando
  con cuánto arranca (efectivo contado, o saldo visto en la cuenta/app
  al momento de abrir).

- Los ingresos (el modelo `Income` que ya genera cada `ClientSession`,
  sección 8) y los egresos con ESE mismo medio de pago, registrados
  mientras esa sesión está abierta, se consultan por rango de fecha al
  momento del cierre — no hace falta que cada ingreso quede enlazado
  manualmente a una sesión.

- Cierre de sesión: el saldo esperado se calcula solo (saldo inicial +
  ingresos − egresos del período, del mismo medio de pago), se ingresa
  el saldo real (contado a mano si es efectivo, o visto en la app si es
  electrónico), y se registra la diferencia si la hay.

- Historial de aperturas y cierres, de todos los medios de pago.

- No permitir más de una sesión abierta para el mismo medio de pago,
  salvo que posteriormente se defina operación con múltiples
  cajas/sedes.

# 13. Reportes e indicadores

El sistema deberá ofrecer consultas por día, semana, mes, año y rango de
fechas.

- Ventas e ingresos por período.

- Ventas por servicio y por profesional.

- Cantidad de sesiones.

- Clientes nuevos y clientes recurrentes.

- Gastos por categoría y proveedor (MVP5).

- Balance de ingresos versus egresos, visible únicamente para Socio
  (MVP5) — desglosado por medio de pago (Efectivo, Yape, Plin, Tarjeta,
  Transferencia) además del total general, para saber cuánto debería
  haber en cada cuenta, no solo en la caja física.

- Caja: aperturas, cierres y diferencias (MVP5).

- Promociones utilizadas y su impacto en ventas, como indicador
  recomendado.

Los indicadores avanzados y su presentación consolidada se profundizan
en MVP6.

# 14. Alertas y comunicaciones

Esta sección cubre comunicaciones **proactivas hacia el cliente**,
distintas de las alertas internas de agenda (sección 8.6), que avisan
al equipo sobre acciones ya ocurridas.

- Identificar clientes próximos a cumplir años.

- Permitir preparar una comunicación de felicitación y, opcionalmente,
  asociar una promoción.

- La automatización del envío por WhatsApp de este tipo de mensajes es
  parte de MVP6 y deberá respetar consentimiento y reglas del canal
  utilizado.

- Futuras alertas sugeridas (MVP6): recordatorio de turno, seguimiento
  post tratamiento y clientes sin visita durante un período
  configurable.

# 15. Flujos principales

## 15.1 Atención sin turno

Buscar/crear cliente → seleccionar profesional → registrar sesión y
servicios → determinar precio/promoción → registrar pago → generar
ingreso de caja → guardar historial.

## 15.2 Atención con turno

Turno reservado → llegada del cliente → abrir ficha → registrar sesión
→ cobrar → **el turno pasa a "Atendido" automáticamente al guardar la
sesión** → generar ingreso → opcionalmente programar próximo turno
(manual, fuera de MVP3).

## 15.3 Gasto operativo

Registrar gasto → seleccionar categoría/proveedor/empleado si
corresponde → adjuntar comprobante → indicar medio de pago → impactar
caja cuando aplique → reflejar en reportes.

## 15.4 Reprogramación

Seleccionar turno → Encargado, Socio, Administrador o IA de WhatsApp
eligen nueva fecha/hora o profesional → validar disponibilidad y
horario de trabajo → guardar trazabilidad → generar alerta en el panel
→ contactar/notificar al cliente si el cambio no lo originó él mismo.

## 15.5 Cancelación de turno

Seleccionar turno → verificar que no tenga sesión vinculada activa →
Encargado, Socio, Administrador o IA de WhatsApp cancelan → registrar
motivo → generar alerta en el panel.

# 16. Plan de implementación propuesto

| **Etapa** | **Alcance** | **Objetivo** | **Estado** |
|---|---|---|---|
| MVP1 | Sitio público + administración de servicios, precios, promociones y publicaciones. | Publicar Dermalash y permitir mantenimiento sin código. | Completado |
| MVP2 | Login, roles, clientes y empleados. | Digitalizar datos maestros y accesos. | Completado |
| MVP3 | Agenda y turnos: calendario propio multi-profesional, horarios de trabajo, vínculo automático con sesiones, alertas internas. | Centralizar la planificación de atención. | En definición funcional (este documento) |
| MVP4 | Integración WhatsApp + asistente de IA (Claude): consultas, reservas, cancelaciones y reprogramaciones en lenguaje natural. | Automatizar disponibilidad, reservas y comunicaciones. | Planificado |
| MVP5 | Proveedores, gastos y caja. | Digitalizar la operación y el control diario. | Planificado |
| MVP6 | Reportes avanzados, alertas proactivas y automatizaciones (cumpleaños, recordatorios, seguimiento). | Mejorar control de gestión y fidelización. | Planificado |

> Cambio respecto a la v1.0: se adelanta Agenda (antes MVP4) a MVP3, y
> WhatsApp+IA (antes MVP5) a MVP4, porque son las prioridades actuales
> del negocio. Proveedores/Gastos/Caja (antes parte de MVP3) pasan a
> MVP5. Sesiones ya está operativo desde una etapa anterior y no forma
> parte de este reordenamiento.

# 17. Lineamientos técnicos y no funcionales

Este documento define el comportamiento funcional y no obliga a una
tecnología específica salvo donde ya se decidió explícitamente (motor
de IA, sección 9.1).

- HTTPS obligatorio y cifrado de comunicaciones.

- Autenticación y recuperación segura de acceso.

- Base de datos con respaldo periódico.

- Archivos privados almacenados con controles de acceso.

- Diseño responsive.

- Buen desempeño desde Lima/Perú mediante infraestructura y/o CDN
  apropiada.

- Registro de auditoría para operaciones sensibles, incluyendo
  borrados definitivos (sección 3.1).

- Exportación de reportes a formatos comunes como Excel/CSV en una
  etapa posterior.

- Cumplimiento de las obligaciones legales y de privacidad aplicables
  en Perú, a validar antes de producción, especialmente para datos
  personales y de salud.

- El desarrollo de MVP3 (Agenda) no requiere servicios externos y
  puede completarse en el entorno local. El desarrollo de MVP4
  (WhatsApp + IA) puede construirse y probarse en el entorno local
  mediante un canal de mensajería simulado (sección 9.4); conectar un
  proveedor real de WhatsApp requerirá credenciales externas y un
  mecanismo de exposición pública para el webhook, a definir cuando
  llegue esa etapa.

# 18. Definiciones pendientes

Los siguientes puntos deberán definirse antes de avanzar sobre los
módulos afectados:

- Dirección, horarios, teléfonos y WhatsApp oficiales de Dermalash.

- Listado inicial de servicios, duración de cada uno (ahora
  obligatoria) y reglas de promociones.

- Horario laboral por defecto de cada esteticista/Encargado, para
  cargar la configuración inicial del módulo de Agenda (sección 8.2).

- Si el borrado definitivo de un turno (exclusivo de Administrador)
  debe generar una alerta en el panel, igual que sí ocurre con la
  creación, modificación y cancelación (sección 8.6).

- Alcance completo del rol Administrador más allá de Agenda y
  Sesiones (sección 3).

- Si existirán múltiples sedes o una única sede.

- Reglas para descuentos manuales y quién puede autorizarlos.

- Política de cancelación, reprogramación y no asistencia: con cuánta
  anticipación se puede cancelar o reprogramar sin penalidad, y qué
  ocurre ante un "no asistió" recurrente.

- Qué antecedentes/documentos clínicos se almacenarán y quién puede
  visualizarlos.

- Necesidad de consentimientos informados y firma digital/electrónica.

- Definición contable del balance: visión operativa de caja versus
  contabilidad formal.

- Proveedor y alcance de la integración oficial de WhatsApp (API de
  Meta directa vs. un BSP como Twilio) y su costo, a resolver cuando
  se aborde MVP4.

- Reglas para adelantos/distribución de ganancias entre socios.

# 19. Criterios generales de aceptación

- Un Socio puede actualizar contenido público sin modificar código.

- Cada usuario accede únicamente a las funciones permitidas por su
  rol.

- Un cliente conserva su historial de sesiones y documentos asociados.

- Una sesión utiliza el precio/promoción vigente y puede registrar uno
  o varios servicios.

- Registrar una sesión vinculada a un turno lo marca como "Atendido"
  automáticamente; borrar esa sesión por error lo devuelve a
  "Confirmado". No existe una acción manual redundante para marcar un
  turno como atendido.

- Los cobros de sesiones y los gastos que correspondan impactan una
  sola vez en caja.

- El Socio puede obtener ventas y balance por período; otros roles no
  acceden al balance restringido.

- El sistema impide solapamientos de horario para un mismo profesional
  y conserva trazabilidad de toda reprogramación o cancelación.

- Toda creación, modificación o cancelación de un turno —la realice un
  humano o el asistente de IA— genera una alerta visible para
  Encargado, Socio y Administrador.

- Un turno no puede cancelarse si tiene una sesión vinculada activa.

- El borrado definitivo de un turno o de una sesión está restringido a
  los roles indicados en la sección 3 y conserva registro de
  auditoría aunque el original deje de existir.

- En la etapa de WhatsApp, una reserva, cancelación o reprogramación
  confirmada por el cliente actualiza la agenda real sin intervención
  manual duplicada.
