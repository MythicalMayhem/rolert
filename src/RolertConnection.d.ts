

interface RolertConnection {
	reconnect(): void
	sleep(): void
	destroy(): void
}

export default RolertConnection
