import { ConnectionState, ConnectionType } from "."

class RolertConnection<callbackParams extends unknown[] = unknown[]> {
	private static name: number = 0
	state: ConnectionState = ConnectionState.Awake

	constructor(
		public connectionType: ConnectionType,
		public readonly name: string = "unnamed connection " + RolertConnection.name++,
		readonly id: number,
		readonly callback: (args: callbackParams) => Promise<void>
	) {}

	wake() {
		if (this.state === ConnectionState.Dead) return
		this.state = ConnectionState.Awake
	}

	sleep() {
		if (this.state === ConnectionState.Dead) return
		this.state = ConnectionState.Asleep
	}

	destroy() {
		this.state = ConnectionState.Dead
	}
}

export default RolertConnection
