declare class RolertConnection {
    readonly name: string;
    wake(): void;
    sleep(): void;
    destroy(): void;
}
export default RolertConnection;
