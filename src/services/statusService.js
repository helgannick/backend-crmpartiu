export function calculateStatus(totalInteractions) {
  if (totalInteractions >= 10) return "vip";
  if (totalInteractions >= 5) return "recorrente";
  if (totalInteractions >= 1) return "engajando";
  return "novo";
}
