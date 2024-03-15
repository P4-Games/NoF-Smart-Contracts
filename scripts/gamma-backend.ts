const gammaEndpoint = "https://gamma-microservice-7bteynlhua-uc.a.run.app/";

export const getPackData = async (userAddress: string, packNumber: number) => {
  const postData = {
    address: userAddress,
    packet_number: packNumber
  };

  const response = await fetch(gammaEndpoint, {
    method: "post",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(postData),
  });
  return response.json()
}