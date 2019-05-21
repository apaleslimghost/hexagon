import React from 'react'
import { render } from 'react-dom'
import styled from 'styled-components'
import { Record, Set } from 'immutable'

class TriangleGridEdge extends Record({ u: 0, v: 0, s: 'W' }) {}

class TriangleGridVertex extends Record({ u: 0, v: 0, s: 'L' }) {
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
}

console.log(new TriangleGridVertex().protrudes.toJS())

render(<h1>it's hot</h1>, document.querySelector('main'))
