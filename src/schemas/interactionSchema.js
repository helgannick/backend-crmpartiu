import { z } from 'zod';

export const interactionCreateSchema = z.object({
  type: z.string().min(1, 'Tipo é obrigatório').max(50),
  note: z.string().max(1000).optional(),
});
