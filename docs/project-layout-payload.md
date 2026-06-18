# Payload de Layout del Proyecto

Este documento describe el payload que se envía para guardar el layout 3D de un proyecto, incluyendo los cambios agregados para mantener alineados el plano 2D y las figuras 3D.

## Endpoint

```http
PUT /Projects/{projectId}/layout
```

Ejemplo:

```http
PUT http://cbs-bi.com/server/api/Projects/TA1/layout
```

## Propósito

El endpoint guarda la configuración visual del proyecto:

- Tamaño del suelo o grid.
- Transformación/calibración del plano cargado.
- Edificios del layout 3D.
- Unidades dentro de cada edificio.

## Campos del Payload

| Campo | Tipo | Requerido | Descripción |
| --- | --- | --- | --- |
| `projectId` | `string` | Sí | Identificador del proyecto. Ejemplo: `TA1`. |
| `gridSize` | `number` | Sí | Tamaño del suelo/grid de la escena 3D. |
| `blueprintTransform` | `BlueprintTransform \| null` | No | Calibración persistente del plano 2D sobre la escena 3D. |
| `buildings` | `Building[]` | Sí | Lista de edificios y unidades del layout. |

## Campo Agregado: `blueprintTransform`

Este campo se agregó para que el plano y las figuras mantengan la misma alineación al abrir el proyecto desde dashboard, editor o después de recargar la página.

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `x` | `number` | Posición horizontal del plano en la escena. |
| `z` | `number` | Posición de profundidad del plano en la escena. |
| `width` | `number` | Ancho visual del plano en unidades 3D. |
| `depth` | `number` | Largo/profundidad visual del plano en unidades 3D. |
| `rotationY` | `number` | Rotación del plano en grados sobre el eje Y. |
| `opacity` | `number` | Opacidad del plano. Rango recomendado: `0.15` a `1`. |

Si `blueprintTransform` llega como `null`, el frontend puede usar el auto-ajuste calculado con base en los límites de los edificios.

## Tipos de Datos

```ts
interface ApiProjectLayoutPayload {
  projectId?: string;
  gridSize?: number;
  blueprintTransform?: BlueprintTransform | null;
  buildings?: Building[];
}

interface BlueprintTransform {
  x: number;
  z: number;
  width: number;
  depth: number;
  rotationY: number;
  opacity: number;
}

interface Building {
  id: string;
  projectId: string;
  name: string;
  position: {
    x: number;
    z: number;
  };
  dimensions: {
    width: number;
    depth: number;
    height: number;
  };
  rotationY: number;
  layoutCols: number;
  layoutRows: number;
  units: Unit[];
}

interface Unit {
  id: string;
  detailedUnitId: number | null;
  buildingId: string;
  name: string;
  floor: number;
  slot: number;
  codUnidad?: string;
  detailedUnitCode?: string;
  externalUnitCode?: string;
  estado?: string;
  status: string;
  paid: boolean;
  price?: number;
  balance?: number;
  deliveryDate?: string;
  bank?: string;
  hasDebt?: boolean;
  enInspeccion?: boolean;
  legal?: boolean;
  titulo?: boolean;
  descargadaDGII?: boolean;
  saldo?: boolean;
}
```

## Ejemplo Completo del JSON

```json
{
  "projectId": "TA1",
  "gridSize": 300,
  "blueprintTransform": {
    "x": 0,
    "z": 0,
    "width": 120,
    "depth": 80,
    "rotationY": 0,
    "opacity": 0.65
  },
  "buildings": [
    {
      "id": "bld_123",
      "projectId": "TA1",
      "name": "Bloque A",
      "position": {
        "x": -10,
        "z": 5
      },
      "dimensions": {
        "width": 12,
        "depth": 8,
        "height": 24
      },
      "rotationY": 0,
      "layoutCols": 2,
      "layoutRows": 2,
      "units": [
        {
          "id": "unt_101",
          "detailedUnitId": 101,
          "buildingId": "bld_123",
          "name": "101",
          "floor": 1,
          "slot": 0,
          "codUnidad": "TA1-A-101",
          "detailedUnitCode": "TA1-A-101",
          "externalUnitCode": "TA1-A-101",
          "estado": "Vendido",
          "status": "sold",
          "paid": false,
          "price": 4500000,
          "balance": 1250000,
          "deliveryDate": "2026-08-15",
          "bank": "Popular",
          "hasDebt": true,
          "enInspeccion": false,
          "legal": true,
          "titulo": false,
          "descargadaDGII": false,
          "saldo": false
        },
        {
          "id": "unt_102",
          "detailedUnitId": 102,
          "buildingId": "bld_123",
          "name": "102",
          "floor": 1,
          "slot": 1,
          "codUnidad": "TA1-A-102",
          "detailedUnitCode": "TA1-A-102",
          "externalUnitCode": "TA1-A-102",
          "estado": "Disponible",
          "status": "available",
          "paid": false,
          "price": 4300000,
          "balance": 4300000,
          "bank": "",
          "hasDebt": true,
          "enInspeccion": false,
          "legal": false,
          "titulo": false,
          "descargadaDGII": false,
          "saldo": false
        }
      ]
    },
    {
      "id": "bld_456",
      "projectId": "TA1",
      "name": "Bloque B",
      "position": {
        "x": 10,
        "z": 5
      },
      "dimensions": {
        "width": 12,
        "depth": 8,
        "height": 24
      },
      "rotationY": 0,
      "layoutCols": 2,
      "layoutRows": 2,
      "units": [
        {
          "id": "unt_201",
          "detailedUnitId": 201,
          "buildingId": "bld_456",
          "name": "201",
          "floor": 2,
          "slot": 0,
          "codUnidad": "TA1-B-201",
          "detailedUnitCode": "TA1-B-201",
          "externalUnitCode": "TA1-B-201",
          "estado": "Entregada",
          "status": "delivered",
          "paid": true,
          "price": 4800000,
          "balance": 0,
          "deliveryDate": "2026-05-20",
          "bank": "BHD",
          "hasDebt": false,
          "enInspeccion": false,
          "legal": true,
          "titulo": true,
          "descargadaDGII": true,
          "saldo": true
        }
      ]
    }
  ]
}
```

## Notas de Compatibilidad

- El backend puede aceptar `blueprintTransform` como `null` para layouts antiguos o proyectos sin calibración manual.
- Si el backend devuelve el layout dentro de una propiedad `layout`, el frontend también lo soporta.
- Si `width` o `depth` de `blueprintTransform` son inválidos o menores/iguales a `0`, el frontend descarta esa calibración y vuelve al auto-ajuste.
- `opacity` se normaliza entre `0.15` y `1`.

## Tareas para Backend

Para soportar correctamente los cambios del frontend, el backend debe actualizar el manejo del layout del proyecto con estas reglas:

### 1. Aceptar el nuevo campo en el request

El endpoint `PUT /Projects/{projectId}/layout` debe aceptar el campo:

```json
"blueprintTransform": {
  "x": 0,
  "z": 0,
  "width": 120,
  "depth": 80,
  "rotationY": 0,
  "opacity": 0.65
}
```

También debe aceptar:

```json
"blueprintTransform": null
```

Esto permite mantener compatibilidad con proyectos que todavía no tienen calibración manual del plano.

### 2. Persistir el campo junto al layout

El backend debe guardar `blueprintTransform` como parte del layout del proyecto, al mismo nivel que:

```json
{
  "projectId": "TA1",
  "gridSize": 300,
  "blueprintTransform": null,
  "buildings": []
}
```

No debe guardarse dentro de un edificio ni dentro de una unidad, porque representa la calibración global del plano del proyecto.

### 3. Devolver el campo al consultar el layout

Cuando el frontend consulte el layout, el backend debe devolver `blueprintTransform` en la respuesta.

Respuesta recomendada:

```json
{
  "projectId": "TA1",
  "gridSize": 300,
  "blueprintTransform": {
    "x": 0,
    "z": 0,
    "width": 120,
    "depth": 80,
    "rotationY": 0,
    "opacity": 0.65
  },
  "buildings": []
}
```

También es compatible si el backend responde envuelto dentro de `layout`:

```json
{
  "layout": {
    "projectId": "TA1",
    "gridSize": 300,
    "blueprintTransform": {
      "x": 0,
      "z": 0,
      "width": 120,
      "depth": 80,
      "rotationY": 0,
      "opacity": 0.65
    },
    "buildings": []
  }
}
```

### 4. Validación recomendada

El backend puede validar el campo con estas reglas:

| Campo | Regla recomendada |
| --- | --- |
| `x` | Debe ser `number`. |
| `z` | Debe ser `number`. |
| `width` | Debe ser `number` mayor que `0`. |
| `depth` | Debe ser `number` mayor que `0`. |
| `rotationY` | Debe ser `number`. Puede aceptar `0` a `359`, aunque el frontend normaliza el valor. |
| `opacity` | Debe ser `number` entre `0.15` y `1`. |

Si `blueprintTransform` es `null`, no se debe rechazar el request.

### 5. No recalcular la calibración manual

El backend no debe modificar automáticamente `x`, `z`, `width`, `depth`, `rotationY` ni `opacity`, salvo validación básica.

Estos valores representan una decisión visual del usuario/editor en el frontend. Si el backend los recalcula, el plano puede volver a descuadrarse.

### 6. Mantener compatibilidad con layouts anteriores

Para layouts guardados antes de este cambio:

- Si no existe `blueprintTransform`, devolver `null` o simplemente omitirlo.
- El frontend soporta ambos casos.
- Si se omite o llega `null`, el frontend usa auto-ajuste inicial.

### 7. Criterio de aceptación

El cambio se considera correcto si:

- `PUT /Projects/{projectId}/layout` recibe y guarda `blueprintTransform`.
- La consulta del layout devuelve el mismo `blueprintTransform` guardado.
- Un proyecto sin `blueprintTransform` sigue cargando sin error.
- Después de ajustar el plano en el editor, guardar y volver a abrir desde dashboard/editor mantiene el plano alineado con las figuras.
