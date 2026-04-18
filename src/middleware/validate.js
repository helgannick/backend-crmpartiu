import { ZodError } from 'zod';

export const validate = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.parseAsync(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: (err.issues ?? []).map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(err);
  }
};
