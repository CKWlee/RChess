
export function calculateElo(playerElo, opponentElo, result, kFactor = 32) {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const delta = Math.round(kFactor * (result - expected));
  return {
    newElo: playerElo + delta,
    delta,
  };
}
