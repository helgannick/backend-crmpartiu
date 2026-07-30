import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM Partiu API',
      version: '1.0.0',
      description: 'API para gestão de clientes, interações e métricas do CRM Partiu.',
      contact: { name: 'Partiu Eventos', email: 'contato@partiu.com' },
    },
    servers: [
      { url: 'http://localhost:3001', description: 'Development' },
      { url: 'https://backend-crmpartiu.onrender.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'auth_token' },
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
      schemas: {
        Client: {
          type: 'object',
          properties: {
            id:                 { type: 'string', format: 'uuid' },
            name:               { type: 'string', example: 'João Silva' },
            email:              { type: 'string', format: 'email', example: 'joao@email.com' },
            phone:              { type: 'string', example: '11987654321' },
            city:               { type: 'string', example: 'São Paulo' },
            gender:             { type: 'string', enum: ['Masculino', 'Feminino', 'Outro', 'Não Quero Identificar'] },
            birth_date:         { type: 'string', format: 'date', example: '1995-06-15' },
            instagram:          { type: 'string', example: '@joaosilva' },
            lead_source:        { type: 'string', example: 'Instagram' },
            bought_with_partiu: { type: 'boolean', example: true },
            status:             { type: 'string', enum: ['novo', 'engajando', 'recorrente', 'vip'], example: 'novo' },
            contacted:          { type: 'boolean', example: false },
            created_at:         { type: 'string', format: 'date-time' },
          },
        },
        ClientCreate: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name:               { type: 'string', minLength: 2, example: 'João Silva' },
            email:              { type: 'string', format: 'email', example: 'joao@email.com' },
            phone:              { type: 'string', example: '11987654321' },
            city:               { type: 'string', example: 'São Paulo' },
            gender:             { type: 'string', enum: ['Masculino', 'Feminino', 'Outro', 'Não Quero Identificar'] },
            birth_date:         { type: 'string', format: 'date', example: '1995-06-15' },
            lead_source:        { type: 'string', example: 'Instagram' },
            bought_with_partiu: { type: 'boolean', example: false },
            music_genres:       { type: 'array', items: { type: 'string' } },
            favorite_event:     { type: 'string', example: 'Summer Vibes' },
            last_event:         { type: 'string', example: 'Reveillon 2025' },
          },
        },
        Interaction: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            client_id:  { type: 'string', format: 'uuid' },
            type:       { type: 'string', example: 'whatsapp' },
            note:       { type: 'string', example: 'Cliente interessado no próximo evento.' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        PaginatedClients: {
          type: 'object',
          properties: {
            data:  { type: 'array', items: { '$ref': '#/components/schemas/Client' } },
            total: { type: 'integer', example: 150 },
            page:  { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Recurso não encontrado' },
          },
        },
        ValidationError: {
          type: 'object',
          properties: {
            error:   { type: 'string', example: 'Dados inválidos' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field:   { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'Email inválido' },
                },
              },
            },
          },
        },
      },
    },
    security: [{ cookieAuth: [] }, { bearerAuth: [] }],
  },
  apis: ['./src/routes/*.js'],
};

export const specs = swaggerJsdoc(options);
