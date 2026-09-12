**DERMALASH**

**Diseño Funcional del Sitio Web y Sistema de Gestión**

Centro Estético - Lima, Perú

  -----------------------------------------------------------------------
  **Documento**                       Diseño Funcional
  ----------------------------------- -----------------------------------
  **Versión**                         1.0

  **Estado**                          Propuesta funcional

  **Fecha**                           Septiembre 2026
  -----------------------------------------------------------------------

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

-   Sitio público: información institucional, tratamientos, precios,
    promociones, novedades/notas, ubicación, mapa y contacto por
    WhatsApp.

-   Módulo privado: clientes, empleados, sesiones, agenda, proveedores,
    gastos, caja, reportes y configuración.

-   Integraciones futuras: WhatsApp para reservas y comunicaciones
    automáticas.

## 1.2 Principios de diseño

-   Estética elegante, minimalista y premium, con transiciones sutiles y
    navegación simple.

-   Diseño responsive para celular, tablet y escritorio.

-   Operación sencilla: los usuarios internos no deben requerir
    conocimientos técnicos.

-   Seguridad y trazabilidad para información privada y sensible.

-   Arquitectura preparada para incorporar nuevas funcionalidades por
    etapas.

# 2. Sitio público

El sitio público será la presencia digital de Dermalash y tendrá como
objetivo informar, generar confianza y convertir visitas en consultas o
reservas.

  -----------------------------------------------------------------------
  **Sección**             **Contenido principal** **Acción esperada**
  ----------------------- ----------------------- -----------------------
  Inicio                  Propuesta de valor,     Consultar / reservar
                          imagen/video principal, 
                          tratamientos            
                          destacados, promociones 
                          y llamadas a la acción. 

  Tratamientos            Catálogo editable con   Consultar tratamiento
                          nombre, descripción,    
                          duración referencial,   
                          precio o precio desde,  
                          imágenes y estado.      

  Promociones             Promociones vigentes    Consultar promoción
                          con fechas, condiciones 
                          e imagen.               

  Novedades / Notas       Publicaciones           Leer / compartir
                          informativas, novedades 
                          y contenido comercial.  

  Nosotros                Presentación del        Generar confianza
                          centro, propuesta de    
                          valor y equipo cuando   
                          corresponda.            

  Ubicación               Dirección, horarios,    Cómo llegar
                          mapa y referencias.     

  Contacto / Reserva      WhatsApp como canal     Iniciar conversación
                          principal; otros datos  
                          de contacto si se       
                          definen.                
  -----------------------------------------------------------------------

## 2.1 Administración de contenido público

El rol Socio podrá crear, modificar, publicar, despublicar y ordenar
servicios, precios, promociones y publicaciones/notas desde una interfaz
administrativa. Los cambios deberán reflejarse en el sitio público sin
requerir edición de código.

# 3. Usuarios, roles y permisos

El módulo privado contará inicialmente con tres roles: Socio, Encargado
y Esteticista. Cada usuario deberá autenticarse con credenciales
individuales.

  -------------------------------------------------------------------------
  **Funcionalidad**   **Socio**         **Encargado**     **Esteticista**
  ------------------- ----------------- ----------------- -----------------
  Contenido web       Administrar       ---               ---

  Clientes            Crear / consultar Crear / consultar Crear / consultar
                      / modificar       / modificar       / modificar

  Sesiones /          Crear / consultar Crear / consultar Crear / consultar
  servicios           / modificar       / modificar       / modificar

  Empleados           Administrar       ---               ---

  Sueldos             Administrar       ---               ---
  referenciales                                           

  Agenda propia       Consultar /       Consultar /       Consultar /
                      gestionar         gestionar         gestionar

  Agenda general      Consultar /       Consultar /       ---
                      gestionar         gestionar         

  Proveedores         Administrar       Administrar       ---

  Gastos / egresos    Administrar       Administrar       ---

  Caja                Administrar       Administrar       ---

  Adelantos a socios  Administrar       ---               ---

  Balance / reportes  Consultar         ---               ---
  financieros                                             
  -------------------------------------------------------------------------

## 3.1 Reglas generales de seguridad

-   No compartir usuarios entre empleados; cada acción debe quedar
    asociada al usuario que la realizó.

-   Aplicar permisos por rol tanto en pantalla como en las operaciones
    del sistema.

-   Registrar fecha, hora y usuario de altas y modificaciones
    relevantes.

-   Proteger fotografías, documentos y antecedentes del cliente; no
    deben ser públicos ni accesibles por URL sin autorización.

-   Definir política de copias de seguridad, recuperación y baja de
    usuarios.

# 4. Dashboard

La pantalla inicial será distinta según el rol. El Socio tendrá una
vista ejecutiva; el Encargado priorizará agenda, caja y operación; el
Esteticista visualizará principalmente sus turnos y sesiones.

-   Socio: ventas del día/semana/mes, gastos, resultado, caja, turnos,
    clientes nuevos/recurrentes y alertas.

-   Encargado: agenda general, próximos turnos, caja abierta,
    incidencias y accesos rápidos.

-   Esteticista: agenda propia del día, ficha del próximo cliente y
    acceso a registrar sesión.

# 5. Gestión de clientes

## 5.1 Ficha de cliente

-   Nombre y apellido.

-   Fecha de nacimiento y sexo.

-   Documento/identificador, cuando corresponda.

-   Teléfono, WhatsApp, correo y otros datos de contacto.

-   Observaciones relevantes.

-   Fotografías y documentos adjuntos.

-   Antecedentes de salud/documentación relacionada, sujeto a los
    controles de privacidad definidos.

-   Historial de sesiones y futuros turnos.

## 5.2 Reglas funcionales

-   Antes de crear un cliente, buscar coincidencias para reducir
    duplicados.

-   Permitir consultar el historial completo desde la ficha.

-   Los archivos deberán registrar quién los adjuntó y cuándo.

-   La eliminación de información sensible deberá estar restringida y,
    preferentemente, conservar trazabilidad.

# 6. Gestión de empleados

-   Alta y modificación por rol Socio.

-   Datos: nombre, apellido, dirección, fecha de nacimiento,
    identificador único y contacto.

-   Tipo de empleado: Esteticista o Encargado.

-   Adjuntar currículum y soporte de estudios/certificaciones.

-   Registrar sueldo referencial mediante períodos de vigencia (fecha
    desde / fecha hasta / monto), conservando historial.

-   Estado del empleado: activo/inactivo, evitando eliminar históricos
    vinculados a sesiones o caja.

# 7. Catálogo de servicios, promociones y sesiones

## 7.1 Catálogo

-   Servicio con nombre, descripción, duración estimada, precio vigente,
    imágenes y estado activo/inactivo.

-   Historial de precios con vigencia para preservar correctamente
    operaciones anteriores.

-   Promociones con período de vigencia, condiciones, precio promocional
    y servicios asociados.

## 7.2 Registro de sesión

-   Seleccionar cliente existente o crearlo durante el proceso.

-   Seleccionar uno o varios servicios realizados.

-   Proponer automáticamente el precio/promoción vigente a la fecha de
    la sesión.

-   Permitir definir el monto total final cuando existan combinaciones o
    ajustes autorizados.

-   Registrar medio de pago y observaciones.

-   Vincular la sesión al profesional que atendió.

-   Al confirmar una sesión cobrada, generar el ingreso correspondiente
    para caja evitando doble carga.

-   En Etapa 2, permitir crear el próximo turno desde la sesión.

# 8. Agenda y turnos - Etapa 2

-   Agenda individual por Esteticista y, cuando corresponda, por
    Encargado que también atienda.

-   Vista diaria, semanal y por profesional.

-   El Esteticista consulta su agenda; el Encargado y el Socio pueden
    visualizar la agenda general.

-   El Encargado/Socio puede reasignar un turno a otro profesional o
    cambiar fecha/hora.

-   Todo cambio sobre un turno reservado deberá quedar trazado y
    disparar una acción de contacto/notificación al cliente.

-   Estados sugeridos: reservado, confirmado, atendido, cancelado,
    reprogramado y no asistió.

-   Evitar solapamientos de horarios para un mismo profesional.

## 8.1 Integración con WhatsApp

En una etapa posterior, el flujo de WhatsApp deberá consultar
disponibilidad real, ofrecer alternativas al cliente y, una vez elegida
una opción, crear el turno en la agenda correspondiente. La integración
deberá contemplar confirmaciones, reprogramaciones y recordatorios.

# 9. Proveedores

-   Alta, consulta y modificación por Socio y Encargado.

-   Nombre/razón social, datos de contacto e identificador fiscal cuando
    exista.

-   Registrar servicios/compras asociados con fecha, concepto y monto
    pagado.

-   Evaluación del proveedor: buena, regular o mala.

-   Permitir vincular el movimiento a un egreso para evitar registrar el
    mismo gasto dos veces.

# 10. Gastos y egresos

-   Registro por Socio y Encargado.

-   Concepto, categoría, fecha, importe, medio de pago,
    comprobante/factura y observaciones.

-   Proveedor opcional.

-   Empleado obligatorio cuando la categoría corresponda a sueldo.

-   Categorías iniciales: alquiler, internet, luz, agua, inventario,
    sueldos y otros.

-   Adelanto de ganancias a socios: categoría especial registrable
    únicamente por Socio.

-   Los egresos que impacten caja deberán integrarse automáticamente con
    el módulo de caja.

# 11. Caja

-   Apertura de caja indicando efectivo/saldo inicial.

-   Registro automático de ingresos provenientes de sesiones cobradas.

-   Registro de egresos asociados a la caja.

-   Cierre de caja con saldo esperado y saldo real; registrar
    diferencias si las hubiera.

-   Historial de aperturas y cierres.

-   No permitir más de una caja abierta para el mismo alcance operativo,
    salvo que posteriormente se defina operación con múltiples
    cajas/sedes.

# 12. Reportes e indicadores

El sistema deberá ofrecer consultas por día, semana, mes, año y rango de
fechas.

-   Ventas e ingresos por período.

-   Ventas por servicio y por profesional.

-   Cantidad de sesiones.

-   Clientes nuevos y clientes recurrentes.

-   Gastos por categoría y proveedor.

-   Balance de ingresos versus egresos, visible únicamente para Socio.

-   Caja: aperturas, cierres y diferencias.

-   Promociones utilizadas y su impacto en ventas, como indicador
    recomendado.

# 13. Alertas y comunicaciones

-   Identificar clientes próximos a cumplir años.

-   Permitir preparar una comunicación de felicitación y, opcionalmente,
    asociar una promoción.

-   La automatización del envío por WhatsApp se considera una
    funcionalidad posterior y deberá respetar consentimiento y reglas
    del canal utilizado.

-   Futuras alertas sugeridas: recordatorio de turno, seguimiento post
    tratamiento y clientes sin visita durante un período configurable.

# 14. Flujos principales

## 14.1 Atención sin turno

Buscar/crear cliente → seleccionar profesional → registrar sesión y
servicios → determinar precio/promoción → registrar pago → generar
ingreso de caja → guardar historial.

## 14.2 Atención con turno

Turno reservado → llegada del cliente → abrir ficha → registrar sesión →
cobrar → marcar turno como atendido → generar ingreso → opcionalmente
programar próximo turno.

## 14.3 Gasto operativo

Registrar gasto → seleccionar categoría/proveedor/empleado si
corresponde → adjuntar comprobante → indicar medio de pago → impactar
caja cuando aplique → reflejar en reportes.

## 14.4 Reprogramación

Seleccionar turno → elegir nueva fecha/hora o profesional → validar
disponibilidad → guardar trazabilidad → contactar/notificar al cliente.

# 15. Plan de implementación propuesto

  -----------------------------------------------------------------------
  **Etapa**               **Alcance**             **Objetivo**
  ----------------------- ----------------------- -----------------------
  MVP 1                   Sitio público +         Publicar Dermalash y
                          administración de       permitir mantenimiento
                          servicios, precios,     sin código.
                          promociones y           
                          publicaciones.          

  MVP 2                   Login, roles, clientes  Digitalizar datos
                          y empleados.            maestros y accesos.

  MVP 3                   Sesiones, proveedores,  Digitalizar la
                          gastos y caja.          operación y el control
                                                  diario.

  MVP 4                   Agenda y turnos.        Centralizar la
                                                  planificación de
                                                  atención.

  MVP 5                   Integración WhatsApp.   Automatizar
                                                  disponibilidad,
                                                  reservas y
                                                  comunicaciones.

  MVP 6                   Reportes avanzados,     Mejorar control de
                          alertas y               gestión y fidelización.
                          automatizaciones.       
  -----------------------------------------------------------------------

# 16. Lineamientos técnicos y no funcionales

Este documento define el comportamiento funcional y no obliga todavía a
una tecnología específica. Como orientación, el sitio público puede
implementarse con un CMS para facilitar el mantenimiento, mientras que
el módulo privado conviene tratarlo como una aplicación de gestión con
autenticación, base de datos y permisos propios.

-   HTTPS obligatorio y cifrado de comunicaciones.

-   Autenticación y recuperación segura de acceso.

-   Base de datos con respaldo periódico.

-   Archivos privados almacenados con controles de acceso.

-   Diseño responsive.

-   Buen desempeño desde Lima/Perú mediante infraestructura y/o CDN
    apropiada.

-   Registro de auditoría para operaciones sensibles.

-   Exportación de reportes a formatos comunes como Excel/CSV en una
    etapa posterior.

-   Cumplimiento de las obligaciones legales y de privacidad aplicables
    en Perú, a validar antes de producción, especialmente para datos
    personales y de salud.

# 17. Definiciones pendientes

Los siguientes puntos deberán definirse durante el diseño detallado
antes de desarrollar los módulos afectados:

-   Dirección, horarios, teléfonos y WhatsApp oficiales de Dermalash.

-   Listado inicial de servicios, duración, precios y reglas de
    promociones.

-   Medios de pago definitivos (efectivo, Yape, Plin, tarjeta,
    transferencia u otros).

-   Si existirán múltiples sedes o una única sede.

-   Reglas para descuentos manuales y quién puede autorizarlos.

-   Política de cancelación, reprogramación y no asistencia.

-   Qué antecedentes/documentos clínicos se almacenarán y quién puede
    visualizarlos.

-   Necesidad de consentimientos informados y firma digital/electrónica.

-   Definición contable del balance: visión operativa de caja versus
    contabilidad formal.

-   Proveedor y alcance de la integración oficial de WhatsApp.

-   Reglas para adelantos/distribución de ganancias entre socios.

# 18. Criterios generales de aceptación

-   Un Socio puede actualizar contenido público sin modificar código.

-   Cada usuario accede únicamente a las funciones permitidas por su
    rol.

-   Un cliente conserva su historial de sesiones y documentos asociados.

-   Una sesión utiliza el precio/promoción vigente y puede registrar uno
    o varios servicios.

-   Los cobros de sesiones y los gastos que correspondan impactan una
    sola vez en caja.

-   El Socio puede obtener ventas y balance por período; otros roles no
    acceden al balance restringido.

-   En la etapa de agenda, el sistema impide solapamientos y conserva
    trazabilidad de reprogramaciones.

-   En la etapa de WhatsApp, una reserva confirmada crea un turno real
    en la agenda sin intervención manual duplicada.
