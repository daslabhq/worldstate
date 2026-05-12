/**
 * MeshFile — canonical type for any 3D file an agent might operate on.
 *
 * One asset, format-discriminated rendering. The format determines which
 * viewer the HTML/MCP-Apps targets pick (model-viewer for glb/gltf/usdz
 * today; Mol*, urdf-loader, three-stl-loader to follow). Markdown / Text
 * targets stay format-agnostic — the agent's context window sees a
 * compact summary regardless of underlying format.
 *
 * Vendor / domain extensions stack on top via `extends`:
 *   - protein/structure  extends ["mesh/file"]   (pdb, mmcif)
 *   - robot/arm          extends ["mesh/file"]   (urdf)
 *   - printable/object   extends ["mesh/file"]   (stl, 3mf)
 *   - lab/labware        extends ["mesh/file"]   (glb, urdf)
 *
 * This is the spatial-state seam: any 3D thing — a printed bracket, a
 * folded protein, a robot arm, a lab plate — flows through scenecast's
 * existing multi-target render pipeline (HTML / Markdown / Text / A2UI /
 * MCP Apps). The same WidgetData a Daslab dashboard renders is the same
 * WidgetData fed to an LLM's context window.
 */

import { defineAsset } from "../asset.js";
import { defineView }  from "../view.js";
import { ICONS }       from "../views/heroicons.js";
import type {
  WidgetData, Model3DFormat, Model3DBounds,
} from "../widgets.js";

export interface MeshFileState {
  /** Format hint — drives renderer selection. */
  format:        Model3DFormat;
  /** URL to the file. https://, data:, or blob:. */
  uri:           string;
  /** Display name. Defaults to the format if omitted. */
  name?:         string;
  /** Free-form description shown in larger views. */
  description?:  string;
  /** Approximate dimensions for the agent-readable summary. */
  bounds?:       Model3DBounds;
  /** Vertex / atom / triangle count. */
  vertexCount?:  number;
  /** Poster / thumbnail URL shown before the model loads. */
  posterUri?:    string;
  /** model-viewer camera hint, e.g. "0deg 75deg 105%". */
  cameraOrbit?:  string;
}

const summary = (s: MeshFileState): string => {
  const parts: string[] = [s.format.toUpperCase()];
  if (s.vertexCount != null) {
    const noun = (s.format === "pdb" || s.format === "mmcif") ? "atoms" : "verts";
    parts.push(`${s.vertexCount.toLocaleString()} ${noun}`);
  }
  if (s.bounds) {
    const u  = s.bounds.unit ?? "";
    const f  = (n: number) => (n < 10 ? n.toFixed(2) : n.toFixed(1)) + u;
    parts.push(`${f(s.bounds.width)} × ${f(s.bounds.height)} × ${f(s.bounds.depth)}`);
  }
  return parts.join(" · ");
};

const MeshFileView = defineView<MeshFileState>({
  name: "MeshFile",
  sizes: {
    icon: (_s): WidgetData => ({
      type: "icon",
      glyph: ICONS.cube,
      color: "indigo",
      label: "Model3D",
    }),

    small: (s): WidgetData => ({
      type: "stack",
      header: { glyph: ICONS.cube, color: "indigo", title: s.name ?? "3D model", meta: s.format.toUpperCase() },
      body: [{
        type: "list",
        items: [{ title: summary(s) }],
      }],
    }),

    medium: (s): WidgetData => ({
      type: "stack",
      header: { glyph: ICONS.cube, color: "indigo", title: s.name ?? "3D model", meta: summary(s) },
      body: [
        {
          type: "model_3d",
          uri:          s.uri,
          format:       s.format,
          name:         s.name,
          bounds:       s.bounds,
          vertexCount:  s.vertexCount,
          posterUri:    s.posterUri,
          cameraOrbit:  s.cameraOrbit,
          autoRotate:   true,
        },
        ...(s.description ? [{
          type: "document" as const,
          body: s.description,
        }] : []),
      ],
    }),

    large: (s): WidgetData => ({
      type: "stack",
      header: { glyph: ICONS.cube, color: "indigo", title: s.name ?? "3D model", meta: summary(s) },
      body: [
        {
          type: "model_3d",
          uri:          s.uri,
          format:       s.format,
          name:         s.name,
          bounds:       s.bounds,
          vertexCount:  s.vertexCount,
          posterUri:    s.posterUri,
          cameraOrbit:  s.cameraOrbit,
          autoRotate:   true,
        },
        ...(s.description ? [{
          type: "document" as const,
          body: s.description,
        }] : []),
      ],
    }),
  },
});

export const Mesh = defineAsset<MeshFileState>({
  type: "mesh/file",
  description: "Canonical 3D-file asset — format-discriminated, multi-target rendered.",
  schema: {
    type: "object",
    required: ["format", "uri"],
    properties: {
      format:       { type: "string", enum: [
        "glb","gltf","usd","usdz","stl","obj","ply","urdf","mjcf","pdb","mmcif","sdf","step",
      ]},
      uri:          { type: "string" },
      name:         { type: "string" },
      description:  { type: "string" },
      bounds: {
        type: "object",
        properties: {
          width:  { type: "number" },
          height: { type: "number" },
          depth:  { type: "number" },
          unit:   { type: "string" },
        },
        required: ["width", "height", "depth"],
      },
      vertexCount:  { type: "number" },
      posterUri:    { type: "string" },
      cameraOrbit:  { type: "string" },
    },
  },
  defaultView: MeshFileView,
  /**
   * Mock state: KhronosGroup's Damaged Helmet — the canonical glTF demo,
   * CC-BY-4.0, served from the official Sample-Assets repo. Battle-tested
   * across every glTF renderer in existence.
   */
  mockState: () => ({
    format: "glb",
    uri: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    name: "Damaged Helmet",
    description: "KhronosGroup's reference glTF model — battle-tested across every glTF renderer, CC-BY-4.0. Demonstrates PBR materials, normal maps, and emissive surfaces.",
    bounds:      { width: 1.7, height: 1.7, depth: 1.7, unit: "m" },
    vertexCount: 14_556,
    cameraOrbit: "30deg 75deg 105%",
  }),
});
