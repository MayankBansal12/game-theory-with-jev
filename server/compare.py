"""Compare verified runs that differ only in the primary Jev's opening policy."""
import argparse
from collections import Counter
import json
from pathlib import Path

from .game import BY_ID
from .publish import ReadOnlyStore
from .store import DEFAULT_DB
from .verify import verify

LABELS = {'free': 'Free opening', 'cooperate': 'Cooperate first', 'defect': 'Defect first'}


def metrics(matches, skip=0):
    rows = [row for match in matches for row in match['rounds'][skip:]]
    return {
        'matches': len(matches),
        'rounds': len(rows),
        'pointsPerRound': sum(r['reward_a'] for r in rows) / len(rows),
        'cooperation': sum(r['a'] == 'C' for r in rows) / len(rows),
        'mutualCooperation': sum(r['a'] == r['b'] == 'C' for r in rows) / len(rows),
    }


def compare(store, run_ids):
    scenarios = []
    reference = None
    openings = set()
    for run_id in run_ids:
        run = store.get_run(run_id)
        if not run or run['status'] != 'complete' or not verify(store, run_id)['passed']:
            raise ValueError(f'Run {run_id} must be complete and verified')
        config = run['config']
        comparable = {k: config[k] for k in ('rounds', 'repetitions', 'opponents', 'seed', 'model', 'prompt_version', 'questions')}
        if reference is not None and comparable != reference:
            raise ValueError('Scenario runs must share the same schedule, seed, model, and prompt')
        reference = comparable
        opening = config.get('initial_move', 'free')
        if opening in openings:
            raise ValueError('Provide only one run for each opening policy')
        openings.add(opening)
        matches = [store.match_detail(m['id']) for m in store.matches(run_id)]
        scenarios.append({
            'runId': run_id, 'opening': opening, 'label': LABELS[opening],
            'allRounds': metrics(matches), 'afterOpening': metrics(matches, skip=1),
            'returnsToCooperation': sum(
                previous['a'] == 'D' and current['a'] == 'C'
                for m in matches for previous, current in zip(m['rounds'], m['rounds'][1:])
            ),
            'cooperationByRound': [sum(m['rounds'][i]['a'] == 'C' for m in matches) / len(matches)
                                   for i in range(config['rounds'])],
            'delayedBetrayal': [
                {'moves': moves, 'count': count,
                 'matchId': next(m['id'] for m in matches if m['opponent'] == 'delayed_betrayal'
                                 and ''.join(r['a'] for r in m['rounds']) == moves)}
                for moves, count in Counter(
                    ''.join(r['a'] for r in m['rounds']) for m in matches
                    if m['opponent'] == 'delayed_betrayal'
                ).items()
            ],
            'opponents': [{'id': opponent, 'name': BY_ID[opponent]['name'],
                           'afterOpening': metrics([m for m in matches if m['opponent'] == opponent], skip=1)}
                          for opponent in config['opponents']],
        })
    if not scenarios:
        raise ValueError('Provide at least one run')
    scenarios.sort(key=lambda s: list(LABELS).index(s['opening']))
    return {'config': reference, 'scenarios': scenarios}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run-id', action='append', required=True)
    parser.add_argument('--database', type=Path, default=DEFAULT_DB)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = compare(ReadOnlyStore(args.database), args.run_id)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({'scenarios': len(result['scenarios']), 'output': str(args.output)}))


if __name__ == '__main__':
    main()
