import React, { useState } from 'react'
import { render } from 'react-dom'
import styled, { ThemeProvider } from 'styled-components'
import { Record, Set, List } from 'immutable'

class TriangleGridEdge extends Record({ u: 0, v: 0, s: 'W' }) {
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

class TriangleGridVertex extends Record({ u: 0, v: 0 }) {
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
		return Set.of(
			new TriangleGridVertex({ u: this.u, v: this.v + 1 }),
			new TriangleGridVertex({ u: this.u + 1, v: this.v }),
			new TriangleGridVertex({ u: this.u + 1, v: this.v - 1 }),
			new TriangleGridVertex({ u: this.u, v: this.v - 1 }),
			new TriangleGridVertex({ u: this.u - 1, v: this.v }),
			new TriangleGridVertex({ u: this.u - 1, v: this.v + 1 }),
		)
	}
}

const Vertex = styled.div`
	width: ${({ theme }) => theme.scale / 10}px;
	height: ${({ theme }) => theme.scale / 10}px;
	background: ${({ theme }) => theme.colour || 'black'};
	border-radius: 100%;
	position: absolute;
	top: calc(50vh + ${({ theme, vertex }) =>
		theme.scale * vertex.y - theme.scale / 20}px);
	left: calc(50vw + ${({ theme, vertex }) =>
		theme.scale * vertex.x - theme.scale / 20}px);

	z-index: 1;

	main.debug &::after {
		content: "${({ vertex }) => `${vertex.u},${vertex.v}`}";
		margin-left: 1em;
	}
`

const Edge = styled.div`
	width: ${({ theme }) => theme.scale}px;
	height: ${({ theme }) => theme.scale / 20}px;
	background: ${({ theme, colour }) => colour || theme.colour || 'black'};
	position: absolute;
	top: calc(
		50vh + ${({ theme, edge }) => theme.scale * edge.y - theme.scale / 40}px
	);
	left: calc(50vw + ${({ theme, edge }) => theme.scale * edge.x}px);
	transform-origin: left center;
	transform: rotate(${({ edge }) => edge.angle}deg);

	main.debug &::after {
		content: "${({ edge }) => `${edge.u},${edge.v} ${edge.s}`}";
		margin-left: 1em;
	}
`

const v = new TriangleGridVertex()

const useImmutableState = initial => {
	const [state, setState] = useState(initial)
	return [state, fn => setState(current => current.withMutations(fn))]
}

const Network = () => {
	const [vertices, updateVertices] = useImmutableState(
		Set.of(new TriangleGridVertex({ u: 0, v: 0 })),
	)

	const possibleEdges = vertices.flatMap(v => v.protrudes).toSet()

	const addVertexForEdge = edge => () => {
		updateVertices(vs => edge.endpoints.forEach(v => vs.add(v)))
	}

	return (
		<>
			{vertices.valueSeq().map(v => (
				<Vertex
					key={`${v.u},${v.v}`}
					vertex={v}
					theme={{ scale: 100, colour: 'red' }}
				/>
			))}

			{possibleEdges.valueSeq().map(e => (
				<Edge
					key={`${e.u},${e.v},${e.s}`}
					edge={e}
					data-edge={JSON.stringify(e)}
					colour='grey'
					onClick={addVertexForEdge(e)}
				/>
			))}
		</>
	)
}

render(
	<ThemeProvider theme={{ scale: 100 }}>
		<Network />
	</ThemeProvider>,
	document.querySelector('main'),
)
