export type OrderLineConfigurationIdentity =
  | { kind: 'exact'; value: string }
  | { kind: 'default' };

/**
 * Normaliza las tres representaciones de configuración vacía que pueden
 * coexistir mientras una línea local se reconcilia con el backend.
 */
export function orderLineConfigurationIdentity(
  signature: string | undefined,
  identifiers: readonly string[],
): OrderLineConfigurationIdentity {
  if (!signature || isDefaultOrderLineConfigurationSignature(signature, identifiers)) {
    return { kind: 'default' };
  }

  return { kind: 'exact', value: signature };
}

export function isDefaultOrderLineConfigurationSignature(
  signature: string,
  identifiers: readonly string[],
): boolean {
  return identifiers.some((identifier) => {
    if (signature === `service-config:${identifier}`) {
      return true;
    }

    if (!signature.startsWith(identifier)) {
      return false;
    }

    const suffix = signature.slice(identifier.length);
    return suffix.length > 0 && /^[|:]+$/.test(suffix);
  });
}
