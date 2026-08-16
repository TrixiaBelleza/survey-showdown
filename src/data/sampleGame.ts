import type { Answer, GameState, Question, Round, Team } from '../types'
import { TIMER_MS } from '../types'

function answers(list: string[]): Answer[] {
  return list.map((text, i) => ({ id: `a${i + 1}`, text, rank: i + 1 }))
}

function question(id: string, text: string, category: string, list: string[]): Question {
  return {
    id,
    text,
    category,
    answers: answers(list).map((a) => ({ ...a, id: `${id}_${a.id}` })),
  }
}

function team(id: string, name: string, color: string, players: string[], questionId: string): Team {
  return {
    id,
    name,
    color,
    questionId,
    players: players.map((n, i) => ({ id: `${id}_p${i + 1}`, name: n })),
  }
}

export const SAMPLE_QUESTIONS: Question[] = [
  question('q_phrase', "Name a phrase you've heard WAY too many times at work.", 'Work life', [
    'Let me share my screen',
    'Sorry I was on mute',
    'Can you repeat that',
    'Quick question',
    'Can you hear me?',
    'Can you see my screen?',
    'Touch base',
    'Do you have a minute?',
    "Let's discuss this offline",
    "I'll get back to you on this",
  ]),
  question('q_excuse', "Name an excuse people use when they don't want to go out.", 'Everyday comedy', [
    'Not feeling well',
    'Already have plans',
    'Bad weather',
    'I have work',
    'Just saw this message',
    'Too far',
    'No money',
    'Tired',
    'Something to do at home',
    'Car broken',
  ]),
  question('q_present', "Name something you don't want to happen while you're presenting in a meeting.", 'Meetings', [
    'Someone asks a question you cannot answer',
    'Wrong tab shows',
    'Internet fails',
    'You get an embarrassing notification',
    'You forgot what you have to say',
    "Forgot you're muted",
    'App suddenly not working',
    'Mic stops working',
    'Battery dies',
    'Someone walks in / knocks',
  ]),
  question('q_sleepy', "You're getting sleepy during work. What might you do to stay awake?", 'Work life', [
    'Drink coffee',
    'Stand up / walk around',
    'Wash your face',
    'Eat a snack',
    'Drink water',
    'Listen to music',
    'Stretch / exercise',
    'Talk to someone',
    'Get some fresh air',
    'Check phone',
  ]),
  question('q_night', 'Name a job that requires working in the middle of the night.', 'Tiebreaker', [
    'Doctor / nurse',
    'Security guard',
    'Call center / support',
    'Baker',
    'Truck / delivery driver',
    'Police / firefighter',
    'Bartender / nightlife staff',
    'IT / on-call engineer',
    'Factory / warehouse shift',
    'Pilot / flight crew',
  ]),
  question('q_lose', 'Name something you always seem to lose at home.', 'Spare', [
    'Keys',
    'Remote control',
    'Phone charger',
    'Socks',
    'Scissors',
    'Pen',
    'Glasses / sunglasses',
    'USB cable / dongle',
    'Hair tie / clip',
    'Receipt / warranty',
  ]),
]

export const SAMPLE_TEAMS: Team[] = [
  team('t_red', 'Red', '#ef4444', ['Anna', 'Ben', 'Carla', 'David', 'Emma', 'James', 'Lisa', 'Mark', 'Sarah', 'Tom'], 'q_phrase'),
  team('t_blue', 'Blue', '#3b82f6', ['Alex', 'Bianca', 'Chris', 'Dana', 'Eli', 'Faith', 'Gabe', 'Hana', 'Ivan', 'Jill'], 'q_excuse'),
  team('t_green', 'Green', '#22c55e', ['Amy', 'Bruno', 'Cleo', 'Dean', 'Ella', 'Finn', 'Gina', 'Hugo', 'Iris', 'Jake'], 'q_present'),
  team('t_yellow', 'Yellow', '#eab308', ['Ava', 'Blake', 'Cora', 'Drew', 'Ezra', 'Fern', 'Gil', 'Holly', 'Ida', 'Jonas'], 'q_sleepy'),
]

export function emptyRound(): Round {
  return {
    revealed: [],
    rotation: 1,
    currentPlayerId: null,
    guesses: 0,
    started: false,
    ended: false,
  }
}

export function createSampleState(): GameState {
  const rounds: Record<string, Round> = {}
  for (const t of SAMPLE_TEAMS) rounds[t.id] = emptyRound()

  return {
    gameName: 'Survey Showdown',
    teams: SAMPLE_TEAMS.map((t) => ({ ...t, players: t.players.map((p) => ({ ...p })) })),
    questions: SAMPLE_QUESTIONS.map((q) => ({ ...q, answers: q.answers.map((a) => ({ ...a })) })),
    rounds,
    scoreOverrides: {},
    phase: 'lobby',
    activeTeamId: null,
    timer: { durationMs: TIMER_MS, endsAt: null, pausedMs: null, visible: false },
    tiebreaker: {
      active: false,
      questionId: 'q_night',
      teamIds: [],
      revealed: [],
      currentTeamId: null,
      currentPlayerId: null,
      winnerTeamId: null,
    },
    showScores: false,
    soundOn: true,
  }
}
