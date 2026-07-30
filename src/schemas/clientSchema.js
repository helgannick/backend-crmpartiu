import { z } from 'zod';

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  .refine((d) => d <= new Date().toISOString().split('T')[0], 'Data deve estar no passado')
  .optional();

export const clientCreateSchema = z.object({
  name:               z.string().min(2, 'Nome muito curto').max(100),
  email:              z.string().email('Email inválido'),
  phone:              z.string().regex(/^\d{10,11}$/, 'Telefone deve ter 10 ou 11 dígitos').optional(),
  city:               z.string().min(2).max(100).optional(),
  gender:             z.enum(['Masculino', 'Feminino', 'Outro', 'Não Quero Identificar']).optional(),
  birth_date:         isoDate,
  lead_source:        z.string().max(100).optional(),
  bought_with_partiu: z.boolean().optional(),
  favorite_event_id:  z.string().optional(),
  favorite_event:     z.string().max(150).optional(),
  music_genres:       z.array(z.string()).optional(),
  other_genre:        z.string().max(100).optional(),
  music_genre_other:  z.string().max(100).optional(),
  last_event:         z.string().max(150).optional(),
  contacted:          z.boolean().optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

export const clientBulkSchema = z.object({
  clients: z.array(
    z.object({
      name:               z.string().min(2).max(100),
      email:              z.string().email('Email inválido'),
      phone:              z.string().regex(/^\d{10,11}$/).optional(),
      city:               z.string().max(100).optional(),
      gender:             z.enum(['Masculino', 'Feminino', 'Outro', 'Não Quero Identificar']).optional(),
      birth_date:         isoDate,
      lead_source:        z.string().max(100).optional(),
      bought_with_partiu: z.boolean().optional(),
      instagram:          z.string().max(100).optional(),
    })
  ).min(1, 'Lista não pode ser vazia').max(5000, 'Máximo de 5000 registros por importação'),
});
