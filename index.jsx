import React, { useReducer, Fragment, useState } from 'react'
import { render } from 'react-dom'
import styled, { ThemeProvider } from 'styled-components'
import { Record, Set, List, fromJS, Range, is } from 'immutable'

class TriangleGridEdge extends Record({ u: 0, v: 0, s: 'W', player: null }) {
	get x() {
		return this.s === 'E' ? this.u + 0.5 * (this.v + 1) : this.u + 0.5 * this.v
	}

	get y() {
		return this.s === 'E' ? -ROOT3_2 * (this.v + 1) : -ROOT3_2 * this.v
	}

	get angle() {
		return {
			S: 0,
			E: 60,
			W: -60,
		}[this.s]
	}

	get endpoints() {
		switch (this.s) {
			case 'W':
				return Set.of(
					new TriangleGridVertex({ u: this.u, v: this.v + 1 }),
					new TriangleGridVertex({ u: this.u, v: this.v }),
				)
			case 'E':
				return Set.of(
					new TriangleGridVertex({ u: this.u, v: this.v + 1 }),
					new TriangleGridVertex({ u: this.u + 1, v: this.v }),
				)
			case 'S':
				return Set.of(
					new TriangleGridVertex({ u: this.u + 1, v: this.v }),
					new TriangleGridVertex({ u: this.u, v: this.v }),
				)
		}
	}
}

const ROOT3_2 = Math.sin(Math.PI / 3)

class TriangleGridVertex extends Record({ u: 0, v: 0, player: null }) {
	get x() {
		return this.u + 0.5 * this.v
	}

	get y() {
		return -ROOT3_2 * this.v
	}

	get protrudes() {
		return Set.of(
			new TriangleGridEdge({ u: this.u, v: this.v, s: 'W' }),
			new TriangleGridEdge({ u: this.u, v: this.v, s: 'S' }),
			new TriangleGridEdge({ u: this.u, v: this.v - 1, s: 'E' }),
			new TriangleGridEdge({ u: this.u, v: this.v - 1, s: 'W' }),
			new TriangleGridEdge({ u: this.u - 1, v: this.v, s: 'S' }),
			new TriangleGridEdge({ u: this.u - 1, v: this.v, s: 'E' }),
		)
	}

	get adjacent() {
		return this.protrudes.flatMap(edge => edge.endpoints).remove(this)
	}

	accessibleVerticesVia(edges, notVia, traversed = new Set()) {
		const accessibleEdges = this.protrudes
			.intersect(edges)
			.subtract(traversed)
			.subtract(notVia.protrudes)

		if (accessibleEdges.size === 0) {
			return new Set()
		}

		return accessibleEdges
			.flatMap(edge => {
				const otherVertex = edge.endpoints.remove(this)

				return otherVertex.concat(
					otherVertex
						.first()
						.accessibleVerticesVia(edges, notVia, traversed.add(edge)),
				)
			})
			.toSet()
	}
}

const Vertex = styled.div`
	width: ${({ theme }) => theme.scale / 10}px;
	height: ${({ theme }) => theme.scale / 10}px;
	background: ${({ theme, colour }) => colour || theme.colour || 'black'};
	border: ${({ theme }) => theme.scale / 40}px solid rgba(0, 0, 0, 0.2);
	border-radius: 100%;
	position: absolute;
	top: calc(50vh + ${({ theme, vertex }) =>
		theme.scale * vertex.y - theme.scale / 14}px);
	left: calc(50vw + ${({ theme, vertex }) =>
		theme.scale * vertex.x - theme.scale / 20 - theme.scale / 2}px);

	z-index: 1;

	&:hover {
		background: blue;
	}

	main.debug &::after {
		content: "${({ vertex }) => `${vertex.u},${vertex.v}`}";
		margin-left: 1em;
	}
`

const Matchstick = styled.div`
	width: ${({ theme }) => theme.scale}px;
	height: ${({ theme }) => theme.scale / 20}px;
	background: ${({ theme, colour }) => colour || theme.colour || 'black'};
	margin-bottom: ${({ theme }) => theme.scale / 40}px;
`

const Edge = styled(Matchstick)`
	position: absolute;
	top: calc(
		50vh + ${({ theme, edge }) => theme.scale * edge.y - theme.scale / 40}px
	);
	left: calc(50vw + ${({ theme, edge }) =>
		theme.scale * edge.x - theme.scale / 2 + theme.scale / 40}px);
	transform-origin: left center;
	transform: rotate(${({ edge }) => edge.angle}deg);

	&:hover {
		background: blue;
	}

	main.debug &::after {
		content: "${({ edge }) => `${edge.u},${edge.v} ${edge.s}`}";
		margin-left: 1em;
	}
`

const v = new TriangleGridVertex()

const useImmutableReducer = (reducer, initialState) =>
	useReducer(
		(state, action) => state.update(draft => reducer(draft, action)),
		initialState,
	)

const Move = Record({ render() {}, reduce() {} })

const moves = fromJS({
	expand: new Move({
		render: ({ state, dispatch, player, disabled }) => {
			if (disabled) return null

			const possibleExpansionEdges =
				state.getIn(['players', state.currentPlayer, 'matchsticks']) > 0
					? state.players
							.get(state.currentPlayer)
							.node.protrudes.subtract(state.edges)
							.subtract(state.players.flatMap(player => player.edges))
					: new Set()

			return possibleExpansionEdges
				.valueSeq()
				.map(e => (
					<Edge
						key={`${e.u},${e.v},${e.s}`}
						edge={e}
						data-edge={JSON.stringify(e)}
						colour='grey'
						onClick={() => dispatch({ edge: e })}
					/>
				))
		},
		reduce: (state, action) =>
			state.getIn(['players', state.currentPlayer, 'matchsticks']) > 0
				? state
						.updateIn(['players', state.currentPlayer, 'edges'], e =>
							e.add(action.edge),
						)
						.updateIn(
							['players', state.currentPlayer, 'matchsticks'],
							m => m - 1,
						)
				: state,
	}),

	move: new Move({
		render: ({ state, dispatch, disabled }) => {
			if (disabled) return null

			const possibleMoveVertices = state.players
				.get(state.currentPlayer)
				.node.accessibleVerticesVia(
					state.getIn(['players', state.currentPlayer, 'edges']),
					state.players.delete(state.currentPlayer).first().node,
				)

			return possibleMoveVertices
				.valueSeq()
				.map(v => (
					<Vertex
						key={`${v.u},${v.v}`}
						vertex={v}
						data-vertex={JSON.stringify(v)}
						colour='grey'
						onClick={() => dispatch({ node: v })}
					/>
				))
		},
		reduce: (state, action) =>
			state.setIn(['players', state.currentPlayer, 'node'], action.node),
	}),

	resupply: new Move({
		render: ({ state, dispatch, player, disabled }) => {
			const hexagons = findHexagons(player.edges)

			return player.edges
				.valueSeq()
				.map(e => (
					<Edge
						key={`${e.u},${e.v},${e.s}`}
						edge={e}
						colour={
							hexagons.some(h => h.has(e)) ? 'rebeccapurple' : player.colour
						}
						data-edge={JSON.stringify(e)}
						onClick={disabled ? () => dispatch({ edge: e }) : undefined}
					/>
				))
		},
		reduce: (state, action) =>
			state
				.update(['players', state.currentPlayer, 'edges'], e =>
					e.remove(action.edge),
				)
				.updateIn(['players', state.currentPlayer, 'matchsticks'], m => m + 1),
	}),

	assault: new Move({
		render: ({ state, dispatch, player, disabled }) => {
			if (disabled) return null
			const otherPlayer = state.players.delete(state.currentPlayer).first()

			const possibleAssaultEdges =
				state.getIn(['players', state.currentPlayer, 'matchsticks']) > 0
					? state.players
							.get(state.currentPlayer)
							.node.protrudes.intersect(otherPlayer.edges.concat(state.edges))
							.subtract(otherPlayer.node.protrudes)
					: new Set()

			return possibleAssaultEdges
				.valueSeq()
				.map(e => (
					<Edge
						key={`${e.u},${e.v},${e.s}`}
						edge={e}
						data-edge={JSON.stringify(e)}
						colour='brickred'
						onClick={() => dispatch({ edge: e })}
					/>
				))
		},

		reduce: (state, action) => {
			const otherPlayer = state.players.delete(state.currentPlayer).first()
			const otherPlayerIndex = state.players.indexOf(otherPlayer)
			const movementNode = action.edge.endpoints
				.remove(state.getIn(['players', state.currentPlayer, 'node']))
				.first()

			if (otherPlayer.edges.has(action.edge)) {
				return state
					.updateIn(['players', otherPlayerIndex, 'matchsticks'], m => m + 1)
					.updateIn(['players', state.currentPlayer, 'matchsticks'], m => m - 1)
					.updateIn(['players', otherPlayerIndex, 'edges'], e =>
						e.remove(action.edge),
					)
					.updateIn(['players', state.currentPlayer, 'edges'], e =>
						e.add(action.edge),
					)
					.setIn(['players', state.currentPlayer, 'node'], movementNode)
			} else if (state.edges.has(action.edge)) {
				return state
					.updateIn(['players', state.currentPlayer, 'matchsticks'], m => m - 1)
					.update('edges', e => e.remove(action.edge))
					.updateIn(['players', state.currentPlayer, 'edges'], e =>
						e.add(action.edge),
					)
					.setIn(['players', state.currentPlayer, 'node'], movementNode)
			} else return state
		},
	}),
})

const movesReducer = (state, action) =>
	moves
		.get(action.type)
		.reduce(state, action)
		.update('currentPlayer', c => (c + 1) % 2)

const Player = Record({
	name: '',
	matchsticks: 20,
	node: new TriangleGridVertex(),
	edges: new Set(),
	colour: '',
})

const State = Record({
	players: new List(),
	edges: new Set(),
	currentPlayer: 0,
	winner: null,
})

const bren = new Player({
	name: 'Bren',
	colour: 'dodgerblue',
	node: new TriangleGridVertex({ u: 0, v: 0 }),
})

const piers = new Player({
	name: 'Piers',
	colour: 'gold',
	node: new TriangleGridVertex({ u: 1, v: 0 }),
})

const initialState = new State({
	players: List.of(bren, piers),
	edges: Set.of(new TriangleGridEdge({ u: 0, v: 0, s: 'S' })),
	currentPlayer: 0,
})

const findHexagons = edges =>
	edges
		.filter(edge => edge.s === 'S')
		.map(edge =>
			Set.of(
				edge,
				new TriangleGridEdge({ u: edge.u + 1, v: edge.v - 1, s: 'E' }),
				new TriangleGridEdge({ u: edge.u + 2, v: edge.v - 2, s: 'W' }),
				new TriangleGridEdge({ u: edge.u + 1, v: edge.v - 2, s: 'S' }),
				new TriangleGridEdge({ u: edge.u, v: edge.v - 2, s: 'E' }),
				new TriangleGridEdge({ u: edge.u, v: edge.v - 1, s: 'W' }),
			),
		)
		.filter(hexagon => hexagon.isSubset(edges))

const Board = () => {
	const [state, dispatch] = useImmutableReducer(movesReducer, initialState)
	const [winner, setWinner] = useState(null)

	if (!winner) {
		const maybeWinner = state.players.find(
			player => findHexagons(player.edges).size > 0,
		)
		if (maybeWinner) {
			setWinner(maybeWinner)
		}
	}

	return (
		<>
			{state.edges.valueSeq().map(e => (
				<Edge key={`${e.u},${e.v},${e.s}`} edge={e} colour='red' />
			))}
			{winner && <h1>{winner.name} wins!</h1>}
			{state.players.map((player, index) => (
				<Fragment key={player.name}>
					<div key={`${player.name}-info`}>
						{state.currentPlayer === index ? (
							<em>{player.name}</em>
						) : (
							player.name
						)}
						{Range(0, player.matchsticks).map(i => (
							<Matchstick colour={player.colour} key={i} />
						))}
					</div>

					<Vertex
						key={`${player.name}-node`}
						vertex={player.node}
						theme={{ scale: 100, colour: player.colour }}
					/>

					{moves.entrySeq().map(([type, move]) => (
						<move.render
							key={type}
							state={state}
							player={player}
							dispatch={action => dispatch({ type, ...action })}
							disabled={winner}
						/>
					))}
				</Fragment>
			))}
		</>
	)
}

render(
	<ThemeProvider theme={{ scale: 100 }}>
		<Board />
	</ThemeProvider>,
	document.querySelector('main'),
)
