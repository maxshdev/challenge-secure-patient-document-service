Te lo voy a desarmar como lo analizaría un arquitecto senior evaluando el alcance real del challenge, no solo lo que “dice”, sino lo que **realmente están evaluando detrás**.

---

# 🎯 1. ¿Qué es realmente este test?

No es un CRUD.

Es una evaluación de:

- 🧠 Capacidad de diseño arquitectónico
- 🔐 Mentalidad de seguridad (no solo “poner un if”)
- 🏥 Conciencia HIPAA (datos sensibles reales)
- ☁️ Conocimiento práctico de AWS
- 📐 Trabajo spec-driven
- 🧩 Pensamiento estructurado y trade-offs

No están buscando features.
Están buscando **criterio técnico y madurez profesional**.

---

# 🧠 2. Qué significa “Spec-First Approach” (esto es clave)

Te obligan a:

> 1️⃣ Escribir SPEC.md antes de codear  
> 2️⃣ Definir entidades, endpoints, reglas de acceso y supuestos  

Esto evalúa:

- Si sabés modelar antes de programar
- Si reducís ambigüedad
- Si detectás huecos en los requerimientos
- Si pensás en contratos y no en controllers

Lo que debería incluir tu SPEC:

## 🔹 Entidades

No solo Document.

También:
- User (aunque venga del token)
- AuditLog (si querés sumar)
- Relaciones claras

## 🔹 Endpoints

No solo listar rutas.

Sino:

- Request body esperado
- Response shape
- Códigos HTTP
- Errores posibles
- Casos edge

## 🔹 Reglas de acceso

Muy explícitas:

- Qué puede hacer cada rol
- En qué condiciones
- Qué pasa si no cumple

## 🔹 Supuestos

Ejemplo:

- Se asume autenticación ya resuelta
- Se asume S3 privado
- Se asume que doctorId es el uploader
- No hay edición ni borrado

Esta parte es evaluada tanto como el código.

---

# 📦 3. Funcionalidad que piden (lo mínimo)

## 1️⃣ Document Management

Endpoints obligatorios:

| Método | Endpoint | Qué hace |
|--------|----------|----------|
| POST | /documents | Upload |
| GET | /documents | Listar accesibles |
| GET | /documents/:id | Metadata |

Documento tiene:

```
id
patientId
doctorId
fileKey
createdAt
```

Importante:

- fileKey ≠ URL pública
- Solo metadata en DB
- Archivo en S3

---

## 2️⃣ Autenticación (simulada)

No implementás JWT.
Te dicen que el user ya viene decodificado:

```ts
type User = {
  id: string
  role: 'admin' | 'doctor' | 'patient'
}
```

Se espera que lo uses en middleware o contexto.

Lo que evalúan acá:

- Que no confíes en request.body.user
- Que no aceptes doctorId arbitrario
- Que derives doctorId desde el user logueado

---

## 3️⃣ Autorización (esto es el core real del test)

Reglas:

### 🔹 Admin
- Acceso total

### 🔹 Doctor
- Puede subir documentos
- Puede ver SOLO los que él creó

### 🔹 Patient
- Puede ver SOLO documentos donde patientId === user.id

Lo que evalúan:

- Si aplicás RBAC + reglas por recurso
- Si hacés filtrado en DB (y no en memoria)
- Si evitás IDOR (Insecure Direct Object Reference)
- Si protegés GET /documents/:id

Muchos candidatos fallan acá.

---

# 🗄 4. Base de datos (PostgreSQL)

Te evalúan:

- Diseño correcto
- Claves foráneas
- Índices
- Tipos correctos
- Timestamps adecuados
- Integridad referencial

No es solo crear tabla.

Esperan algo como:

- UUID como PK
- FK implícita hacia user (aunque no tengas tabla user)
- Índices en patientId y doctorId

---

# ☁️ 5. S3

Piden:

- Archivo en S3
- Metadata en DB
- NO URLs públicas

Opcional:
- Pre-signed URLs

Lo que evalúan:

- Que el bucket sea privado
- Que entiendas acceso controlado
- Que no guardes archivos en base64 en la DB
- Que no devuelvas directamente fileKey

---

# 🔐 6. Seguridad (nivel profesional)

Te dicen explícitamente:

> Diseñalo como si manejara PHI (Protected Health Information)

Evalúan si pensás en:

- Encriptación en tránsito (HTTPS)
- Encriptación en reposo (RDS + S3 SSE)
- Least privilege
- Validación de input
- Evitar logging de datos sensibles
- IAM roles correctos

Si solo hacés CRUD → estás desaprobado en mindset.

---

# 🏥 7. HIPAA Awareness

No esperan que seas abogado.

Pero sí que menciones:

- Encryption at rest
- Encryption in transit
- Audit logs
- Access tracking
- Data minimization
- Secrets management
- Incident response plan

Si no hablás de auditoría → red flag.

---

# 🏗 8. ARCHITECTURE.md

Esta parte es extremadamente importante.

Debés explicar cómo lo desplegarías en AWS usando:

- ECS / Fargate
- RDS
- S3
- CloudTrail

Evalúan:

- Entendimiento de infraestructura
- Seguridad en cloud
- Escalabilidad
- Separación de responsabilidades

También:

## 🔐 Seguridad

- IAM roles por servicio
- SG restrictivos
- S3 privado
- KMS
- Secrets Manager

## 📈 Escalabilidad

- Auto scaling en ECS
- RDS vertical vs horizontal
- Bottleneck: DB
- Uso eventual de read replicas

---

# 📁 9. Entregables

Esperan estructura clara:

```
/src
SPEC.md
ARCHITECTURE.md
README.md
```

El README debe incluir:

- Cómo correr
- Supuestos
- Trade-offs
- Qué mejorarías
- Respuestas a las 11 preguntas

---

# 🧠 10. Las 11 preguntas del README (esto es clave)

No son triviales.
Son preguntas de seniority.

Ejemplos:

## 🔹 ¿Dónde aplicarías encryption y por qué?
Evalúan si entendés:
- TLS
- RDS encryption
- S3 SSE
- KMS

## 🔹 ¿Cómo evitás que un doctor acceda a docs de otro?
Evalúan:
- Query-level filtering
- Authorization layer
- Defense in depth

## 🔹 Si se filtra un snapshot de DB?
Evalúan:
- Encryption at rest
- Hashing
- Tokenización
- Data minimization

## 🔹 ¿Qué NO deberías loguear?
Evalúan:
- PHI
- fileKey
- Tokens
- Headers sensibles

## 🔹 ¿Por qué spec-first?
Evalúan madurez profesional.

---

# ⭐ 11. Detalles que diferencian a un Staff Engineer (Plus Real)

Si querés demostrar que estás en otro nivel, cuidá estos detalles sutiles pero críticos:

## ⚠️ No exponer `fileKey` nunca
No basta con quitarlo del `GET`. **Tampoco lo devuelvas en el `POST` response**.
- El cliente no lo necesita.
- Elimina vectores de ataque de enumeración por completo.

## ⚠️ Streaming vs Buffering
En la entrevista te van a preguntar: *"¿Qué pasa si 100 usuarios suben archivos de 10MB a la vez?"*.
- Si usás `Buffer` (en memoria), podés causar **GC pauses**, latencia alta y **DoS**.
- La respuesta correcta: *"Implementé buffer por simplicidad del challenge, pero en productivo usaría **Multipart Streaming** directo a S3"*.

## ⚠️ Orphaned Records (Riesgo de No-FK)
Al no tener tabla de usuarios (auth externa):
- **Problema:** Si borran un usuario en Auth0, sus documentos quedan huérfanos en tu DB.
- **Solución:** Mencionar explícitamente la necesidad de un proceso de **reconciliación periódica** o webhooks de "User Deleted" para limpiar datos. Esto demuestra visión sistémica.

## ⚠️ Rate Limiting en PHI
No es opcional.
- Un script bajando 1000 historias clínicas es una brecha de datos masiva.
- Mencionar **Rate Limiting** estricto en los endpoints de `download` y `list`.

## ⚠️ Logging Redaction Automático
No confíes en que el developer se acuerde de no loguear datos sensibles.
- Implementar **interceptors globales** o configuración de logger (Pino/Winston) que redacte automáticamente keys como `password`, `token`, `file`, `ssn`.

---

# 📊 Nivel real del challenge

No es junior.
No es mid.
Es claramente senior-level backend + cloud awareness.
Si cubrís los puntos del capítulo 11, estás en nivel **Tech Lead / Staff**.