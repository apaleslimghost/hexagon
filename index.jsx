import React from 'react'
import { render } from 'react-dom'
import styled, { ThemeProvider } from 'styled-components'
import { Record, Set } from 'immutable'

class TriangleGridEdge extends Record({ u: 0, v: 0, s: 'W' }) {}

const ROOT3_2 = Math.sin(Math.PI / 3)

class TriangleGridVertex extends Record({ u: 0, v: 0 }) {
	get x() {
		return this.u + 0.5 * this.v
	}

	get y() {
		return ROOT3_2 * this.v
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
	top: ${({ theme, vertex }) => theme.scale * vertex.y}px;
	left: ${({ theme, vertex }) => theme.scale * vertex.x}px;
`

const v = new TriangleGridVertex({ u: 1, v: 2 })

render(
	<ThemeProvider theme={{ scale: 100 }}>
		<>
			<Vertex vertex={v} />

			{v.adjacent.valueSeq().map(a => (
				<Vertex
					key={`${a.u},${a.v}`}
					vertex={a}
					theme={{ scale: 100, colour: 'red' }}
				/>
			))}
		</>
	</ThemeProvider>,
	document.querySelector('main'),
)
