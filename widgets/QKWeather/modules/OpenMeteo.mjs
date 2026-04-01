function buildUrl(name, language, countryCode) {
    let url = "https://geocoding-api.open-meteo.com/v1/search";
    url += "?name=" + encodeURIComponent(name);
    url += "&count=10";
    url += "&language=" + language;

    if (countryCode && countryCode !== null) {
        url += "&country=" + countryCode;
    }

    return url;
}

function parseLocationItem(item) {
    return {
        locationId: item.id || 0,
        name: item.name || "",
        countryId: item.country_id || 0,
        country: item.country || "",
        admin1: item.admin1 || "",
        latitude: item.latitude || 0.0,
        longitude: item.longitude || 0.0
    };
}

function makeHttpRequest(url) {
    return new Promise(function(resolve) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        const searchResults = [];

                        if (data.results && Array.isArray(data.results)) {
                            for (let i = 0; i < data.results.length; i++) {
                                searchResults.push(parseLocationItem(data.results[i]));
                            }
                        }

                        resolve(searchResults);
                    } catch (parseError) {
                        console.log("OpenMeteo error: Failed to parse JSON response", parseError);
                        resolve([]);
                    }
                } else {
                    console.log("OpenMeteo error: HTTP request failed with status", xhr.status, xhr.statusText);
                    resolve([]);
                }
            }
        };

        xhr.onerror = function() {
            console.log("OpenMeteo error: Network request failed");
            resolve([]);
        };

        xhr.send();
    });
}

function fetchWeatherLocations(name, language, countryCode) {
    if (!name || name.length < 2) {
        return Promise.resolve([]);
    }

    const url = buildUrl(name, language, countryCode);
    return makeHttpRequest(url);
}

function buildDisplayValue(location) {
    let name = location.name;

    if (location.country && location.country !== "") {
        name += ", " + location.country;
    }

    // Add admin1("State") for USA only
    const USACountryId = 6252001;
    if (location.countryId === USACountryId && location.admin1 && location.admin1 !== "") {
        name += ", " + location.admin1;
    }

    return name;
}

export function getWeatherLocations(query) {
    const localeCode = iCUE.iCUELanguage || 'en';
    return fetchWeatherLocations(query, localeCode, null)
        .then(function (locations) {
            return locations.map(function(location) {
                return {
                    key: location.locationId,
                    value: buildDisplayValue(location)
                };
            });
        });
}

function makeLocationRequest() {
    return new Promise(function(resolve, reject) {
        const url = "https://api.ipregistry.co/?key=" + iCUE.ipRegistryApiKey;
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        resolve(data);
                    } catch (parseError) {
                        console.log("OpenMeteo error: Failed to parse JSON response", parseError);
                        reject(parseError);
                    }
                } else {
                    console.log("OpenMeteo error: HTTP request failed with status", xhr.status, xhr.statusText);
                    reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
                }
            }
        };

        xhr.onerror = function() {
            console.log("OpenMeteo error: Network request failed");
            reject(new Error("Network request failed"));
        };

        xhr.send();
    });
}

function getCurrentLocation() {
    return makeLocationRequest()
        .then(function(locationData) {
            const location = locationData.location;
            if (!location) {
                throw new Error("No location data in response");
            }

            const cityName = location.city;
            const latitude = location.latitude;
            const longitude = location.longitude;
            const countryCode = location.country ? location.country.code : "";

            if (!cityName || latitude === undefined || longitude === undefined) {
                throw new Error("Incomplete location data received");
            }

            return {
                name: cityName,
                countryCode: countryCode,
                latitude: latitude,
                longitude: longitude
            };
        })
        .catch(function(error) {
            console.log("OpenMeteo error: getCurrentLocation failed", error);
            return null;
        });
}

function calculateLocationDifference(location1, location2) {
    return Math.abs(location2.latitude - location1.latitude) + Math.abs(location2.longitude - location1.longitude);
}

function findClosestLocation(currentLocation, weatherLocations) {
    if (!weatherLocations || weatherLocations.length === 0) {
        throw new Error("No weather locations found");
    }

    let closestLocation = weatherLocations[0];
    let minDiff = calculateLocationDifference(currentLocation, closestLocation);

    for (let i = 1; i < weatherLocations.length; i++) {
        const diff = calculateLocationDifference(currentLocation, weatherLocations[i]);

        if (diff < minDiff) {
            minDiff = diff;
            closestLocation = weatherLocations[i];
        }
    }

    return closestLocation;
}

function processLocationData(currentLocation, localeCode) {
    const cityName = currentLocation.name;
    const countryCode = currentLocation.countryCode;

    return fetchWeatherLocations(cityName, localeCode, countryCode)
        .then(function(weatherLocations) {
            return findClosestLocation(currentLocation, weatherLocations);
        });
}

export function getDefaultLocation() {
    const localeCode = iCUE.iCUELanguage || 'en';
    return getCurrentLocation()
        .then(function(currentLocation) {
            if (!currentLocation) {
                throw new Error("Could not get current location");
            }

            return processLocationData(currentLocation, localeCode);
        })
        .then(function(location) {
            return [location.locationId, buildDisplayValue(location)];
        })
        .catch(function(error) {
            console.log("OpenMeteo error: getDefaultLocation failed", error);
            return [5368361, tr("Los Angeles, United States, California")];
        });
}
