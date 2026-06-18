# API de colores globales de unidades

Esta documentacion describe el contrato que necesita el frontend para guardar y consultar los colores globales de estados de unidades. La API backend esta hecha en .NET Core.

## Objetivo

Permitir administrar una paleta global de colores para estados de unidades, por ejemplo `Vendido`, `Disponible`, `Intercambio`, etc. Estos colores se usan en toda la aplicacion: vista 3D, guia de colores y dashboard.

## Base URL

El frontend usa la variable:

```ts
VITE_API_BASE_URL
```

Si no existe, usa:

```txt
http://localhost:5153/api
```

Todos los endpoints de esta funcionalidad cuelgan de:

```txt
/api/Settings/unit-colors
```

## Autenticacion

El frontend envia el token del usuario autenticado en el header:

```http
Authorization: Bearer {accessToken}
```

Recomendado:

- `GET`: usuarios autenticados.
- `POST`, `PUT`, `DELETE`: preferiblemente `admin` o roles con permiso de configuracion.

## Modelo de datos

### UnitColorSetting

```json
{
  "id": 1,
  "estado": "Vendido",
  "colorCss": "#22c55e"
}
```

| Campo | Tipo | Requerido | Descripcion |
|---|---:|---:|---|
| `id` | `int`, `long`, `Guid` o `string` | No en `POST`, si en respuesta | Identificador unico del registro. |
| `estado` | `string` | Si | Nombre visible del estado. Ejemplo: `Vendido`. |
| `colorCss` | `string` | Si | Color hexadecimal CSS en formato `#RRGGBB`. Ejemplo: `#22c55e`. |

### Reglas de validacion

- `estado` no debe estar vacio.
- `estado` debe ser unico sin importar mayusculas, minusculas ni acentos.
- `colorCss` debe cumplir el formato hexadecimal `^#[0-9a-fA-F]{6}$`.
- Se recomienda guardar `estadoKey` normalizado para validar unicidad.

Ejemplo de normalizacion:

```csharp
static string NormalizeEstadoKey(string value)
{
    var normalized = value.Trim().Normalize(NormalizationForm.FormD);
    var chars = normalized
        .Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark)
        .ToArray();

    return new string(chars).Normalize(NormalizationForm.FormC).ToLowerInvariant();
}
```

## Endpoints requeridos

### Obtener colores

```http
GET /api/Settings/unit-colors
```

Respuesta `200 OK`:

```json
[
  {
    "id": 1,
    "estado": "Vendido",
    "colorCss": "#22c55e"
  },
  {
    "id": 2,
    "estado": "Disponible",
    "colorCss": "#3b82f6"
  }
]
```

El frontend tambien acepta respuestas envueltas:

```json
{
  "data": [
    {
      "id": 1,
      "estado": "Vendido",
      "colorCss": "#22c55e"
    }
  ]
}
```

Tambien acepta las propiedades `items`, `result`, `colors`, `unitColors` o `unitStatusColors`.

### Crear color

```http
POST /api/Settings/unit-colors
Content-Type: application/json
```

Request esperado:

```json
{
  "id": null,
  "estado": "Reservado",
  "name": "Reservado",
  "label": "Reservado",
  "color": "#f59e0b",
  "colorCss": "#f59e0b"
}
```

Campos importantes para persistir:

```json
{
  "estado": "Reservado",
  "colorCss": "#f59e0b"
}
```

El frontend envia tambien `name`, `label` y `color` como alias para compatibilidad. El backend puede ignorarlos si usa `estado` y `colorCss`.

Respuesta recomendada `201 Created` o `200 OK`:

```json
{
  "id": 3,
  "estado": "Reservado",
  "colorCss": "#f59e0b"
}
```

### Actualizar color

```http
PUT /api/Settings/unit-colors/{id}
Content-Type: application/json
```

Request:

```json
{
  "id": 3,
  "estado": "Reservado",
  "name": "Reservado",
  "label": "Reservado",
  "color": "#f97316",
  "colorCss": "#f97316"
}
```

Respuesta recomendada `200 OK`:

```json
{
  "id": 3,
  "estado": "Reservado",
  "colorCss": "#f97316"
}
```

### Eliminar color

```http
DELETE /api/Settings/unit-colors/{id}
```

Respuesta recomendada:

```http
204 No Content
```

Tambien funciona `200 OK`.

## Codigos de estado recomendados

| Codigo | Uso |
|---:|---|
| `200 OK` | Consulta o actualizacion correcta. |
| `201 Created` | Creacion correcta. |
| `204 No Content` | Eliminacion correcta. |
| `400 Bad Request` | Datos invalidos, color mal formado o estado vacio. |
| `401 Unauthorized` | Token faltante o invalido. |
| `403 Forbidden` | Usuario sin permiso para mantenimiento. |
| `404 Not Found` | Color no encontrado al editar/eliminar. |
| `409 Conflict` | Ya existe un color para el mismo estado normalizado. |
| `500 Internal Server Error` | Error inesperado. |

## DTOs sugeridos para .NET Core

```csharp
public sealed class UnitColorSettingDto
{
    public int Id { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string ColorCss { get; set; } = string.Empty;
}

public sealed class SaveUnitColorSettingRequest
{
    public int? Id { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Label { get; set; }
    public string? Color { get; set; }
    public string ColorCss { get; set; } = string.Empty;
}
```

## Entidad sugerida

```csharp
public sealed class UnitColorSetting
{
    public int Id { get; set; }
    public string Estado { get; set; } = string.Empty;
    public string EstadoKey { get; set; } = string.Empty;
    public string ColorCss { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

Indice unico recomendado:

```csharp
builder.Entity<UnitColorSetting>()
    .HasIndex(x => x.EstadoKey)
    .IsUnique();
```

## Controller sugerido

```csharp
[ApiController]
[Route("api/[controller]")]
public sealed class SettingsController : ControllerBase
{
    [HttpGet("unit-colors")]
    public async Task<ActionResult<List<UnitColorSettingDto>>> GetUnitColors()
    {
        // Retornar lista ordenada por Estado.
    }

    [HttpPost("unit-colors")]
    public async Task<ActionResult<UnitColorSettingDto>> CreateUnitColor(SaveUnitColorSettingRequest request)
    {
        // Validar Estado y ColorCss.
        // Normalizar EstadoKey.
        // Validar duplicado.
        // Guardar y retornar DTO.
    }

    [HttpPut("unit-colors/{id}")]
    public async Task<ActionResult<UnitColorSettingDto>> UpdateUnitColor(int id, SaveUnitColorSettingRequest request)
    {
        // Buscar por id.
        // Validar Estado y ColorCss.
        // Validar duplicado de EstadoKey excluyendo el id actual.
        // Actualizar y retornar DTO.
    }

    [HttpDelete("unit-colors/{id}")]
    public async Task<IActionResult> DeleteUnitColor(int id)
    {
        // Buscar por id.
        // Eliminar.
        // Retornar NoContent().
    }
}
```

## Valores iniciales recomendados

Si la tabla esta vacia, el backend puede insertar estos valores por defecto:

```json
[
  {
    "estado": "Vendido",
    "colorCss": "#22c55e"
  },
  {
    "estado": "Disponible",
    "colorCss": "#3b82f6"
  },
  {
    "estado": "Intercambio",
    "colorCss": "#64748b"
  }
]
```

## Notas de compatibilidad con el frontend

- El frontend lee `id`, `estado` y `colorCss`.
- Si la respuesta usa mayusculas (`Id`, `Estado`, `ColorCss`), tambien la puede normalizar.
- Si el backend devuelve una lista vacia, el frontend usa colores por defecto en memoria.
- Al guardar o eliminar, el frontend espera que el backend responda `2xx`.
- El color seleccionado debe ser global, no por proyecto.
