/**
 * Interfaz común para enviar un mensaje de vuelta a un cliente, sin importar
 * el canal. El resto del sistema (loop del agente, historial, alertas)
 * llama siempre a `sendMessage(...)` sin saber qué canal es — así se evita
 * rediseñar nada al conectar WhatsApp real (Fase 2 del MVP4). La persistencia
 * del mensaje en la conversación la hace `runAssistantTurn`, no el proveedor
 * — así ningún canal puede "olvidarse" de guardar su propia respuesta.
 */
export interface MessagingProvider {
  sendMessage(to: string, text: string): Promise<void>;
}

/**
 * Chat de prueba dentro del admin (Fase 1): no hay envío real, la UI lee el
 * mensaje directo de la base (ya persistido por `runAssistantTurn`).
 */
export class SimulatedMessagingProvider implements MessagingProvider {
  async sendMessage(): Promise<void> {}
}
