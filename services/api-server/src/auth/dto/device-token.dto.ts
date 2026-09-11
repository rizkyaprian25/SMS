import { IsIn, IsString } from 'class-validator';

export class DeviceTokenDto {
  @IsString()
  fcmToken!: string;

  @IsIn(['ANDROID', 'IOS', 'WEB'])
  platform!: 'ANDROID' | 'IOS' | 'WEB';
}
