<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

API REST para Gestión Completa de Empleos construida con [NestJS](https://github.com/nestjs/nest) y TypeScript.

### ✨ Características Principales

- **Publicación de Empleos**: Crear, actualizar y gestionar ofertas de trabajo
- **Búsqueda Avanzada**: Búsqueda con múltiples filtros (ubicación, salario, tipo, nivel)
- **Exportación CSV**: Exportar todas las ofertas en formato CSV
- **Fuentes Externas**: Integración con APIs externas de empleos (LinkedIn, GitHub, Indeed)
- **Alertas de Empleo**: Suscripción a notificaciones por email con filtros personalizables
- **Autenticación JWT**: Seguridad con tokens JWT
- **Swagger/OpenAPI**: Documentación automática de API

### 📦 Nuevos Módulos Agregados

#### 1. Jobs Module - Publicación de Empleos
- CRUD completo de ofertas
- Búsqueda avanzada con filtros
- Exportación a CSV
- Soporte para ofertas internas y externas
- Análisis de palabras clave trending

#### 2. Job Alerts Module - Alertas de Empleo
- Suscripción por email
- Filtros personalizables (ubicación, salario, tipo, nivel)
- Notificaciones automáticas
- Estadísticas de alertas

#### 3. External Job Sources Module - Fuentes Externas
- Registro dinámico de nuevas fuentes
- Parsers para LinkedIn, GitHub, Indeed
- Sincronización automática de empleos

---

## 🚀 Inicio Rápido

### Prerequisitos
- Node.js 18+
- PNPM (o NPM)
- MySQL 5.7+

### Instalación

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp apps/api/.env.example apps/api/.env

# Crear base de datos
mysql -u root -p
CREATE DATABASE jobs_db CHARACTER SET utf8mb4;
```

### Ejecutar

```bash
# Desarrollo con watch mode
pnpm run dev

# Compilar
pnpm run build

# Producción
pnpm run prod
```

API disponible en: `http://localhost:3000`  
Swagger docs: `http://localhost:3000/api/docs`

---

## 📖 Documentación

- **[JOBS_MODULE_README.md](./JOBS_MODULE_README.md)** - Documentación técnica completa
- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Especificación detallada de endpoints
- **[GUIA_RAPIDA.md](./GUIA_RAPIDA.md)** - Guía de inicio rápido en español
- **[EJEMPLOS_REQUESTS.md](./EJEMPLOS_REQUESTS.md)** - Ejemplos de requests con curl
- **[CHANGELOG.md](./CHANGELOG.md)** - Historial de cambios

---

## 🔌 Endpoints Principales

### Jobs (Publicación)
```
POST   /jobs                    - Crear oferta
GET    /jobs                    - Listar ofertas
GET    /jobs/:id               - Obtener detalle
PATCH  /jobs/:id               - Actualizar
DELETE /jobs/:id               - Eliminar
POST   /jobs/search            - Búsqueda avanzada
GET    /jobs/export/csv        - Exportar a CSV
GET    /jobs/trending/keywords - Palabras clave trending
```

### Job Alerts (Alertas)
```
POST   /job-alerts              - Crear alerta
POST   /job-alerts/authenticated - Crear alerta (autenticado)
GET    /job-alerts              - Listar alertas
GET    /job-alerts/user/:userId - Alertas del usuario
GET    /job-alerts/:id          - Obtener detalle
PATCH  /job-alerts/:id          - Actualizar
DELETE /job-alerts/:id          - Desactivar
POST   /job-alerts/notify/check - Enviar notificaciones
GET    /job-alerts/stats        - Estadísticas
```

### External Sources (Fuentes Externas)
```
GET    /external-job-sources              - Listar fuentes
POST   /external-job-sources/register     - Registrar fuente
POST   /external-job-sources/fetch/:key   - Obtener empleos
POST   /external-job-sources/sync/:key    - Sincronizar empleos
```

---

## 🔐 Autenticación

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Usar token
curl -H "Authorization: Bearer {token}" http://localhost:3000/jobs
```

---

## 📊 Ejemplos de Uso

### Crear Oferta
```bash
curl -X POST http://localhost:3000/jobs \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior Developer",
    "description": "Descripción...",
    "company": "TechCorp",
    "location": "Buenos Aires",
    "salary_min": 80000,
    "salary_max": 120000
  }'
```

### Buscar Ofertas
```bash
curl -X POST http://localhost:3000/jobs/search \
  -H "Content-Type: application/json" \
  -d '{
    "keyword": "Python",
    "location": "Buenos Aires",
    "salary_min": 50000
  }'
```

### Crear Alerta
```bash
curl -X POST http://localhost:3000/job-alerts \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "search_pattern": "Python Developer",
    "location": "Buenos Aires"
  }'
```

---

## Project setup

```bash
$ pnpm install
```

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
