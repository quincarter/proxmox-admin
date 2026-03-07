import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from "class-validator";

export class LoginDto {
  @IsOptional()
  @IsString()
  serverId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  host?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsNotEmpty()
  realm!: string;

  @IsOptional()
  @IsIn(["system", "self-signed", "insecure"])
  tlsMode?: "system" | "self-signed" | "insecure";

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsBoolean()
  saveServer?: boolean;
}
