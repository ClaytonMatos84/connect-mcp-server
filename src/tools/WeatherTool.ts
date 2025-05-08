import { MCPTool } from 'mcp-framework';
import { z } from 'zod';
import axios from 'axios';

interface WeatherInput {
    city: string;
}

interface WeatherApiResponse {
    city: string;
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    feelsLike: number;
    precipitation: number;
    description: string;
}

class WeatherTool extends MCPTool<WeatherInput> {
    name = 'clima_api';
    description = 'Informações sobre o clima de uma cidade (usando api Open-Meteo)';

    private readonly GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';
    private readonly API_URL = 'https://api.open-meteo.com/v1/forecast';

    schema = {
        city: {
            type: z.string(),
            description: 'Nome da cidade para a qual você deseja obter informações sobre o clima (Ex: São Paulo, Rio de Janeiro, etc.)',
        },
    };

    async execute({ city }: WeatherInput): Promise<WeatherApiResponse> {
        try {
            const geoResponse = await axios.get(this.GEOCODING_URL, {
                params: {
                    name: city,
                    count: 1,
                    language: 'pt',
                    format: 'json'
                }
            });

            if (!geoResponse.data.results?.length) {
                throw new Error(`Cidade ${city} não encontrada.`);
            }

            const location = geoResponse.data.results[0];

            const weatherResponse = await axios.get(this.API_URL, {
                params: {
                    latitude: location.latitude,
                    longitude: location.longitude,
                    current: ['temperature_2m', 'relative_humidity_2m', 'apparent_temperature', 'precipitation', 'weather_code', 'wind_speed_10m'],
                    timezone: 'auto',
                }
            });

            const current = weatherResponse.data.current;

            const condition = this.getWeatherCondition(current.weather_code);
            const temperature = Math.round(current.temperature_2m);
            const humidity = Math.round(current.relative_humidity_2m);
            const windSpeed = Math.round(current.wind_speed_10m);

            return {
                city: location.name,
                temperature,
                condition,
                humidity,
                windSpeed,
                feelsLike: Math.round(current.apparent_temperature),
                precipitation: current.precipitation,
                description: `O clima em ${city} está com a condição de ${condition}, com uma temperatura de ${temperature}°C, umidade de ${humidity}% e vento a ${windSpeed}km/h.`,
            };
        } catch (error) {
            if (error instanceof Error) {
                console.error('Error fetching weather data:', error.message);
                throw new Error(`Erro ao buscar dados do climáticos. ${error.message}`);
            }
            throw new Error('Erro ao buscar dados do clima.');
        }
    }

    private getWeatherCondition(code: number): string {
        const conditions: Record<number, string> = {
            0: 'Céu limpo',
            1: 'Principalmente claro',
            2: 'Parcialmente nublado',
            3: 'Nublado',
            45: 'Nebuloso',
            48: 'Neblina depositante',
            51: 'Chuvisco leve',
            53: 'Chuvisco moderado',
            55: 'Chuvisco denso',
            61: 'Chuvas leves',
            63: 'Chuvas moderadas',
            65: 'Chuvas fortes',
            71: 'Neve leve',
            73: 'Neve moderada',
            75: 'Neve forte',
            77: 'Grãos de neve',
            80: 'Chuvas leves',
            81: 'Chuvas moderadas',
            82: 'Chuvas torrenciais',
            85: 'Neve leve',
            86: 'Neve forte',
            95: 'Tempestade',
            96: 'Tempestade com granizo leve',
            99: 'Tempestade com granizo forte'
        };

        return conditions[code] || 'Desconhecido';
    }
}

export default WeatherTool;